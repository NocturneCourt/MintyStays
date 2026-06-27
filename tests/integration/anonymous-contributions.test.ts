import { describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import { submitAnonymousContribution } from "@/lib/contributions/contributionService";

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
  it("stores anonymous source audit rows and marks disputes for review", async () => {
    const { db, state } = createContributionTestDb();

    const result = await submitAnonymousContribution(db, {
      listingId: "11111111-1111-4111-8111-111111111111",
      sessionId: "session-1",
      vote: "dispute_weak",
      comment: "Central AC never got below warm.",
    });

    expect(result).toEqual({
      status: "created",
      listingStatus: "disputed",
    });
    expect(state.contributions).toMatchObject([
      {
        contributorType: "anonymous",
        sessionId: "session-1",
        vote: "dispute_weak",
      },
    ]);
    expect(state.reviewSignals).toMatchObject([
      {
        source: "anonymous",
        coolingSentiment: "negative",
        weight: "1.25",
      },
    ]);
    expect(state.reviewSignals[0]?.rawExcerpt).toContain(
      "Central AC never got below warm.",
    );
    expect(state.listingUpdates).toMatchObject([{ status: "disputed" }]);
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
    });
    await expect(submitAnonymousContribution(db, input)).resolves.toEqual({
      status: "duplicate",
      listingStatus: "active",
    });

    expect(state.contributions).toHaveLength(1);
    expect(state.reviewSignals).toHaveLength(1);
    expect(state.listingUpdates).toHaveLength(0);
  });
});

function createContributionTestDb() {
  const state: TestState = {
    contributions: [],
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

  const db = {
    select() {
      const query = {
        from() {
          return query;
        },
        where() {
          return query;
        },
        async limit() {
          return state.contributions.length
            ? [{ id: state.contributions[0]?.id ?? "existing" }]
            : [];
        },
      };

      return query;
    },
    async transaction<T>(callback: (tx: TestTransaction) => Promise<T>) {
      return callback(transaction);
    },
  };

  return {
    db: db as unknown as DbClient,
    state,
  };
}
