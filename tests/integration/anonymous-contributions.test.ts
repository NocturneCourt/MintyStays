import { describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import {
  MAX_DISPUTES_PER_LISTING_IP_PER_DAY,
  submitAnonymousContribution,
} from "@/lib/contributions/contributionService";
import {
  calculateGuestSignal,
  type GuestSignalInput,
} from "@/lib/scoring/guestSignalFormula";

type StoredRow = Record<string, unknown>;

type TestState = {
  contributions: StoredRow[];
  reviewSignals: StoredRow[];
  listingUpdates: StoredRow[];
  recomputeCalls: Array<{ listingId: string; now: Date }>;
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

const now = new Date("2026-06-26T12:00:00Z");
const baselineSignals: GuestSignalInput[] = [
  {
    source: "scraped",
    sentiment: "positive",
    rawExcerpt: "AC cooled the room quickly.",
    authoredAt: now,
  },
  {
    source: "scraped",
    sentiment: "positive",
    rawExcerpt: "Strong air conditioning during heatwave.",
    authoredAt: now,
  },
];

describe("anonymous contribution integration", () => {
  it("stores anonymous source audit rows and flags disputes for review without hiding", async () => {
    const { db, state } = createContributionTestDb();

    const result = await submitAnonymousContribution(
      db,
      {
        listingId: "11111111-1111-4111-8111-111111111111",
        sessionId: "session-1",
        vote: "dispute_weak",
        comment: "Central AC never got below warm.",
        clientIp: "203.0.113.10",
        now,
      },
      {
        async recomputeListingSignals(_db, listingId, recomputeAt = now) {
          state.recomputeCalls.push({ listingId, now: recomputeAt });
          return calculateGuestSignal(baselineSignals, recomputeAt);
        },
      },
    );

    expect(result).toMatchObject({
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
    expect(state.recomputeCalls).toHaveLength(1);
  });

  it("recomputes Guest Signal after anonymous contribution (parity with Insider)", async () => {
    const { db, state } = createContributionTestDb();
    const listingId = "44444444-4444-4444-8444-444444444444";

    const result = await submitAnonymousContribution(
      db,
      {
        listingId,
        sessionId: "session-guest-signal",
        vote: "confirm_cold",
        comment: "Bedroom stayed cold all night.",
        now,
      },
      {
        async recomputeListingSignals(_db, id, recomputeAt = now) {
          state.recomputeCalls.push({ listingId: id, now: recomputeAt });
          return calculateGuestSignal(
            [
              ...baselineSignals,
              ...state.reviewSignals.map((signal) => ({
                source: "anonymous" as const,
                sentiment: signal.coolingSentiment as "positive" | "negative",
                rawExcerpt: signal.rawExcerpt as string,
                authoredAt: signal.authoredAt as Date,
              })),
            ],
            recomputeAt,
          );
        },
      },
    );

    expect(result.status).toBe("created");
    expect(result.guestSignal?.status).toBe("scored");
    expect(result.guestSignal?.coolingMentionCount).toBe(3);
    expect(state.recomputeCalls).toEqual([{ listingId, now }]);
  });

  it("prevents duplicate anonymous votes for one listing session", async () => {
    const { db, state } = createContributionTestDb();
    const input = {
      listingId: "22222222-2222-4222-8222-222222222222",
      sessionId: "session-2",
      vote: "confirm_cold" as const,
      now,
    };
    const recompute = {
      async recomputeListingSignals(
        _db: DbClient,
        listingId: string,
        recomputeAt: Date = now,
      ) {
        state.recomputeCalls.push({ listingId, now: recomputeAt });
        return calculateGuestSignal(baselineSignals, recomputeAt);
      },
    };

    await expect(submitAnonymousContribution(db, input, recompute)).resolves.toMatchObject({
      status: "created",
      listingStatus: "active",
      reviewNeeded: false,
    });
    await expect(submitAnonymousContribution(db, input, recompute)).resolves.toEqual({
      status: "duplicate",
      listingStatus: "active",
      reviewNeeded: false,
    });

    expect(state.contributions).toHaveLength(1);
    expect(state.reviewSignals).toHaveLength(1);
    expect(state.listingUpdates).toHaveLength(0);
    // Recompute only on successful create, not on duplicate.
    expect(state.recomputeCalls).toHaveLength(1);
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
    expect(state.recomputeCalls).toHaveLength(0);
  });
});

function createContributionTestDb(options?: { seedContributions?: StoredRow[] }) {
  const state: TestState = {
    contributions: [...(options?.seedContributions ?? [])],
    reviewSignals: [],
    listingUpdates: [],
    recomputeCalls: [],
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
