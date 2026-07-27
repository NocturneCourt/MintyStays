import { describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import {
  MAX_DISPUTES_PER_LISTING_IP_PER_DAY,
  submitAnonymousContribution,
} from "@/lib/contributions/contributionService";

type StoredRow = Record<string, unknown>;

type TestState = {
  contributions: StoredRow[];
  reviewSignals: StoredRow[];
  listingUpdates: StoredRow[];
};

type TestTransaction = {
  insert: (table: unknown) => {
    values: (row: StoredRow) => Promise<void>;
  };
  update: (table: unknown) => {
    set: (row: StoredRow) => {
      where: () => Promise<void>;
    };
  };
};

describe("anonymous contribution integration", () => {
  it("stores anonymous source audit rows and flags disputes for review without hiding", async () => {
    const { db, state } = createContributionTestDb();

    const result = await submitAnonymousContribution(db, {
      listingId: "11111111-1111-4111-8111-111111111111",
      sessionId: "session-1",
      vote: "dispute_weak",
      comment: "Central AC never got below warm.",
      clientIp: "203.0.113.10",
    });

    expect(result).toEqual({
      status: "created",
      listingStatus: "active",
      reviewNeeded: true,
    });
    expect(state.contributions).toMatchObject([
      {
        contributorType: "anonymous",
        sessionId: "session-1",
        vote: "dispute_weak",
        clientIp: "203.0.113.10",
      },
    ]);
    expect(state.reviewSignals).toMatchObject([
      {
        source: "anonymous",
        coolingSentiment: "negative",
      },
    ]);
    expect(state.reviewSignals[0]?.rawExcerpt).toContain(
      "Central AC never got below warm.",
    );
    // Must not auto-hide from public query (status stays active; only review_needed).
    expect(state.listingUpdates).toMatchObject([{ reviewNeeded: true }]);
    expect(state.listingUpdates[0]).not.toHaveProperty("status", "disputed");
  });

  it("prevents duplicate anonymous votes for one listing session", async () => {
    const { db, state } = createContributionTestDb();
    const input = {
      listingId: "22222222-2222-4222-8222-222222222222",
      sessionId: "session-2",
      vote: "confirm_cold" as const,
    };

    await expect(submitAnonymousContribution(db, input)).resolves.toEqual({
      status: "created",
      listingStatus: "active",
      reviewNeeded: false,
    });
    await expect(submitAnonymousContribution(db, input)).resolves.toEqual({
      status: "duplicate",
      listingStatus: "active",
      reviewNeeded: false,
    });

    expect(state.contributions).toHaveLength(1);
    expect(state.reviewSignals).toHaveLength(1);
    expect(state.listingUpdates).toHaveLength(0);
  });

  it("rate limits disputes to 3 per listing per IP per day", async () => {
    const { db, state } = createContributionTestDb({
      seedContributions: Array.from(
        { length: MAX_DISPUTES_PER_LISTING_IP_PER_DAY },
        (_, index) => ({
          id: `prior-${index}`,
          listingId: "33333333-3333-4333-8333-333333333333",
          clientIp: "198.51.100.7",
          vote: "dispute_weak",
          createdAt: new Date("2026-06-26T10:00:00Z"),
        }),
      ),
    });

    const result = await submitAnonymousContribution(db, {
      listingId: "33333333-3333-4333-8333-333333333333",
      sessionId: "session-rate-limit",
      vote: "broken",
      clientIp: "198.51.100.7",
      now: new Date("2026-06-26T12:00:00Z"),
    });

    expect(result).toEqual({
      status: "rate_limited",
      listingStatus: "active",
      reviewNeeded: true,
    });
    expect(state.contributions).toHaveLength(MAX_DISPUTES_PER_LISTING_IP_PER_DAY);
    expect(state.reviewSignals).toHaveLength(0);
    expect(state.listingUpdates).toHaveLength(0);
  });
});

function createContributionTestDb(options?: { seedContributions?: StoredRow[] }) {
  const state: TestState = {
    contributions: [...(options?.seedContributions ?? [])],
    reviewSignals: [],
    listingUpdates: [],
  };

  const transaction: TestTransaction = {
    insert(table) {
      return {
        async values(row) {
          if (table === userContributions) {
            state.contributions.push({
              id: `contribution-${state.contributions.length + 1}`,
              createdAt: new Date(),
              ...row,
            });
            return;
          }

          if (table === reviewSignals) {
            state.reviewSignals.push(row);
            return;
          }

          throw new Error("Unexpected insert target");
        },
      };
    },
    update(table) {
      expect(table).toBe(listings);

      return {
        set(row) {
          return {
            async where() {
              state.listingUpdates.push(row);
            },
          };
        },
      };
    },
  };

  // Select is used for (1) session duplicate check with .limit() and
  // (2) IP rate-limit count when the chain is awaited without .limit().
  function select() {
    const withSession = () => state.contributions.filter((row) => Boolean(row.sessionId));
    const disputeRows = () =>
      state.contributions.filter(
        (row) =>
          row.clientIp &&
          (row.vote === "dispute_weak" || row.vote === "broken"),
      );

    const query = {
      from() {
        return query;
      },
      where() {
        return query;
      },
      async limit() {
        const rows = withSession();
        return rows.length ? [{ id: rows[0]?.id ?? "existing" }] : [];
      },
      then(
        onFulfilled?: (value: StoredRow[]) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) {
        return Promise.resolve(disputeRows()).then(onFulfilled, onRejected);
      },
    };

    return query;
  }

  return {
    db: {
      select,
      async transaction<T>(callback: (tx: TestTransaction) => Promise<T>) {
        return callback(transaction);
      },
    } as unknown as DbClient,
    state,
  };
}
