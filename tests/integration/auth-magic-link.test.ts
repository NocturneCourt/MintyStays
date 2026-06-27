import type { Adapter } from "next-auth/adapters";
import type { EmailConfig } from "next-auth/providers/email";
import { describe, expect, it } from "vitest";
import {
  createAuthOptions,
  syncVerifiedUserState,
  type MagicLinkEmail,
} from "@/lib/auth/authOptions";
import { isAuthEnabled } from "@/lib/auth/featureFlag";

type MemoryUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: Date | null;
  verifiedAt: Date | null;
  role: "insider" | "editor";
};

type MemoryVerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};

type AdapterCreateUserInput = {
  id?: string;
  email: string;
  name?: string | null;
  image?: string | null;
  emailVerified?: Date | null;
};

describe("passwordless auth integration", () => {
  it("keeps auth route disabled unless AUTH_ENABLED is true", () => {
    expect(isAuthEnabled({ AUTH_ENABLED: "false" })).toBe(false);
    expect(isAuthEnabled({ AUTH_ENABLED: undefined })).toBe(false);
    expect(isAuthEnabled({ AUTH_ENABLED: "true" })).toBe(true);
  });

  it("creates a passwordless user and records verified state", async () => {
    const state = createMemoryAuthState();
    const sentEmails: MagicLinkEmail[] = [];
    const authOptions = createAuthOptions({
      adapter: createMemoryAuthAdapter(state),
      emailSender: async (email) => {
        sentEmails.push(email);
      },
      env: {
        AUTH_SECRET: "test-secret",
        EMAIL_FROM: "MintyStays <hello@mintystays.com>",
      },
      verifiedUserStore: {
        async markVerified(userId, verifiedAt) {
          const user = state.users.get(userId);

          if (!user) {
            throw new Error("Missing user");
          }

          user.emailVerified = verifiedAt;
          user.verifiedAt = verifiedAt;
        },
      },
    });
    const adapter = authOptions.adapter;

    if (!adapter?.createVerificationToken || !adapter.useVerificationToken) {
      throw new Error("Passwordless adapter methods are required");
    }

    const provider = authOptions.providers.find((candidate) => {
      return candidate.id === "email" && candidate.type === "email";
    }) as EmailConfig | undefined;

    if (!provider || provider.type !== "email") {
      throw new Error("Email provider is required");
    }
    const mergedProvider = {
      ...provider,
      ...provider.options,
    } as EmailConfig;

    await mergedProvider.sendVerificationRequest({
      identifier: "cool.member@example.com",
      url: "https://mintystays.com/api/auth/callback/email?token=token-1",
      expires: new Date("2026-06-27T12:00:00Z"),
      provider: mergedProvider,
      token: "token-1",
      theme: {},
    });

    await adapter.createVerificationToken({
      identifier: "cool.member@example.com",
      token: "token-1",
      expires: new Date("2026-06-27T12:00:00Z"),
    });

    const token = await adapter.useVerificationToken({
      identifier: "cool.member@example.com",
      token: "token-1",
    });
    const verifiedAt = new Date("2026-06-26T12:30:00Z");
    const user = await adapter.createUser?.({
      id: "ignored-by-memory-adapter",
      email: token?.identifier ?? "cool.member@example.com",
      emailVerified: verifiedAt,
      name: null,
      image: null,
    });

    if (!user) {
      throw new Error("User creation is required");
    }

    await syncVerifiedUserState(
      {
        async markVerified(userId, timestamp) {
          const stored = state.users.get(userId);

          if (!stored) {
            throw new Error("Missing user");
          }

          stored.emailVerified = timestamp;
          stored.verifiedAt = timestamp;
        },
      },
      user,
    );

    expect(sentEmails).toMatchObject([
      {
        to: "cool.member@example.com",
        from: "MintyStays <hello@mintystays.com>",
        subject: "Sign in to mintystays.com",
      },
    ]);
    expect(state.verificationTokens).toHaveLength(0);
    expect(state.users.get(user.id)).toMatchObject({
      email: "cool.member@example.com",
      emailVerified: verifiedAt,
      verifiedAt,
      role: "insider",
    });
  });
});

function createMemoryAuthState() {
  return {
    userCounter: 0,
    users: new Map<string, MemoryUser>(),
    verificationTokens: [] as MemoryVerificationToken[],
  };
}

function createMemoryAuthAdapter(
  state: ReturnType<typeof createMemoryAuthState>,
): Adapter {
  const createUser = (async (newUser: AdapterCreateUserInput) => {
    state.userCounter += 1;

    const stored: MemoryUser = {
      id: `user-${state.userCounter}`,
      email: newUser.email,
      name: newUser.name ?? null,
      image: newUser.image ?? null,
      emailVerified: newUser.emailVerified ?? null,
      verifiedAt: null,
      role: "insider",
    };

    state.users.set(stored.id, stored);

    return stored;
  }) as NonNullable<Adapter["createUser"]>;

  return {
    createUser,
    async getUserByEmail(email) {
      return (
        Array.from(state.users.values()).find((user) => user.email === email) ??
        null
      );
    },
    async createVerificationToken(token) {
      state.verificationTokens.push(token);

      return token;
    },
    async useVerificationToken(params) {
      const tokenIndex = state.verificationTokens.findIndex((token) => {
        return token.identifier === params.identifier && token.token === params.token;
      });

      if (tokenIndex < 0) {
        return null;
      }

      const [token] = state.verificationTokens.splice(tokenIndex, 1);

      return token ?? null;
    },
  };
}
