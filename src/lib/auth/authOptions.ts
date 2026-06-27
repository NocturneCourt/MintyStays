import { DrizzleAdapter } from "@auth/drizzle-adapter";
import type { SendVerificationRequestParams } from "next-auth/providers/email";
import EmailProvider from "next-auth/providers/email";
import type { NextAuthOptions, User } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import type { UserRole } from "./roles";
import { isUserRole } from "./roles";

type AuthEnv = Partial<
  Pick<
  NodeJS.ProcessEnv,
  | "AUTH_SECRET"
  | "NEXTAUTH_SECRET"
  | "EMAIL_FROM"
  | "EMAIL_PROVIDER_API_KEY"
  | "NEXT_PUBLIC_SITE_URL"
  | "NODE_ENV"
  >
>;

export type MagicLinkEmail = {
  to: string;
  from: string;
  subject: string;
  html: string;
  text: string;
};

export type MagicLinkEmailSender = (email: MagicLinkEmail) => Promise<void>;

export type VerifiedUserStore = {
  markVerified(userId: string, verifiedAt: Date): Promise<void>;
};

type MintyAuthOptionsInput = {
  adapter: Adapter;
  emailSender?: MagicLinkEmailSender;
  env?: AuthEnv;
  verifiedUserStore?: VerifiedUserStore;
};

type AuthUserWithRole = User & {
  role?: UserRole | null;
  emailVerified?: Date | null;
  verifiedAt?: Date | null;
};

export async function buildAuthOptions(): Promise<NextAuthOptions> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required when AUTH_ENABLED=true");
  }

  const [{ db }, schema] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
  ]);

  const adapter = DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }) as Adapter;

  return createAuthOptions({
    adapter,
    verifiedUserStore: {
      async markVerified(userId, verifiedAt) {
        const { eq } = await import("drizzle-orm");

        await db
          .update(schema.users)
          .set({
            emailVerified: verifiedAt,
            verifiedAt,
          })
          .where(eq(schema.users.id, userId));
      },
    },
  });
}

export function createAuthOptions({
  adapter,
  emailSender = sendResendMagicLinkEmail,
  env = process.env,
  verifiedUserStore,
}: MintyAuthOptionsInput): NextAuthOptions {
  const secret = env.AUTH_SECRET || env.NEXTAUTH_SECRET;

  return {
    adapter,
    secret,
    session: {
      strategy: "database",
    },
    providers: [
      EmailProvider({
        from: env.EMAIL_FROM || "MintyStays <hello@mintystays.com>",
        maxAge: 24 * 60 * 60,
        async sendVerificationRequest(params) {
          await emailSender(createMagicLinkEmail(params));
        },
      }),
    ],
    callbacks: {
      session({ session, user }) {
        const authUser = user as AuthUserWithRole;

        if (session.user) {
          session.user.id = authUser.id;
          session.user.role = isUserRole(authUser.role)
            ? authUser.role
            : "insider";
          session.user.verifiedAt =
            authUser.verifiedAt ?? authUser.emailVerified ?? null;
        }

        return session;
      },
    },
    events: {
      async signIn({ user }) {
        if (!verifiedUserStore) {
          return;
        }

        await syncVerifiedUserState(verifiedUserStore, user as AuthUserWithRole);
      },
    },
  };
}

export async function syncVerifiedUserState(
  store: VerifiedUserStore,
  user: AuthUserWithRole,
) {
  const verifiedAt = user.verifiedAt ?? user.emailVerified;

  if (!user.id || !verifiedAt) {
    return;
  }

  await store.markVerified(user.id, verifiedAt);
}

export function createMagicLinkEmail(params: SendVerificationRequestParams) {
  const { host } = new URL(params.url);
  const subject = `Sign in to ${host}`;
  const escapedUrl = escapeHtml(params.url);
  const escapedHost = escapeHtml(host);

  return {
    to: params.identifier,
    from: params.provider.from,
    subject,
    text: `Sign in to ${host}\n${params.url}\n\n`,
    html: `<p>Sign in to <strong>${escapedHost}</strong></p><p><a href="${escapedUrl}">Sign in to MintyStays</a></p><p>If you did not request this email, you can ignore it.</p>`,
  };
}

export async function sendResendMagicLinkEmail(email: MagicLinkEmail) {
  const apiKey = process.env.EMAIL_PROVIDER_API_KEY;

  if (!apiKey) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("EMAIL_PROVIDER_API_KEY is required to send magic links");
    }

    console.info(`MintyStays magic link for ${email.to}: ${email.text.trim()}`);
    return;
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "User-Agent": "mintystays/0.1",
    },
    body: JSON.stringify({
      from: email.from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to send magic-link email");
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case "&":
        return "&amp;";
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "\"":
        return "&quot;";
      default:
        return "&#39;";
    }
  });
}
