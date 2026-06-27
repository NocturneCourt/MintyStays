import { describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import { submitInsiderReport } from "@/lib/contributions/insiderReportService";
import {
  calculateGuestSignal,
  type GuestSignalInput,
} from "@/lib/scoring/guestSignalFormula";

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

const now = new Date("2026-06-26T12:00:00Z");
const baselineSignals: GuestSignalInput[] = [
  {
    source: "scraped",
    sentiment: "negative",
    rawExcerpt: "The room stayed warm.",
    extractedAt: now,
  },
  {
    source: "scraped",
    sentiment: "negative",
    rawExcerpt: "Cooling was weak.",
    extractedAt: now,
  },
];

describe("Insider reports", () => {
  it("stores attributable Insider reports and applies higher Guest Signal weight", async () => {
    const { db, state } = createInsiderReportTestDb();

    const result = await submitInsiderReport(
      db,
      {
        listingId: "11111111-1111-4111-8111-111111111111",
        userId: "22222222-2222-4222-8222-222222222222",
        vote: "confirm_cold",
        comment: "Split unit cooled the room fast.",
        now,
      },
      {
        async recomputeListingSignals() {
          return calculateGuestSignal(
            [
              ...baselineSignals,
              ...state.reviewSignals.map((signal) => ({
                source: "insider" as const,
                sentiment: signal.coolingSentiment as "positive",
                rawExcerpt: signal.rawExcerpt as string,
                extractedAt: signal.extractedAt as Date,
              })),
            ],
            now,
          );
        },
      },
    );
    const anonymousComparison = calculateGuestSignal(
      [
        ...baselineSignals,
        {
          source: "anonymous",
          sentiment: "positive",
          rawExcerpt: "Anonymous visitor confirmed cold AC.",
          extractedAt: now,
        },
      ],
      now,
    );

    expect(result.status).toBe("created");
    expect(result.listingStatus).toBe("active");
    expect(state.contributions).toMatchObject([
      {
        contributorType: "insider",
        userId: "22222222-2222-4222-8222-222222222222",
        sessionId: null,
        vote: "confirm_cold",
      },
    ]);
    expect(state.reviewSignals).toMatchObject([
      {
        source: "insider",
        coolingSentiment: "positive",
        weight: "2.50",
      },
    ]);
    expect(state.reviewSignals[0]?.rawExcerpt).toContain(
      "Split unit cooled the room fast.",
    );
    expect(result.guestSignal?.status).toBe("scored");
    expect(anonymousComparison.status).toBe("scored");

    if (result.guestSignal?.status !== "scored" || anonymousComparison.status !== "scored") {
      throw new Error("Expected scored comparison");
    }

    expect(result.guestSignal.score).toBeGreaterThan(anonymousComparison.score);
  });

  it("marks Insider disputes and prevents duplicate reports per listing user", async () => {
    const { db, state } = createInsiderReportTestDb();
    const input = {
      listingId: "33333333-3333-4333-8333-333333333333",
      userId: "44444444-4444-4444-8444-444444444444",
      vote: "broken" as const,
      comment: "Wall unit would not turn on.",
      now,
    };

    await expect(
      submitInsiderReport(db, input, {
        async recomputeListingSignals() {
          return calculateGuestSignal(
            [
              ...baselineSignals,
              {
                source: "insider",
                sentiment: "negative",
                rawExcerpt: state.reviewSignals[0]?.rawExcerpt as string,
                extractedAt: now,
              },
            ],
            now,
          );
        },
      }),
    ).resolves.toMatchObject({
      status: "created",
      listingStatus: "disputed",
    });
    await expect(submitInsiderReport(db, input)).resolves.toEqual({
      status: "duplicate",
      listingStatus: "disputed",
    });

    expect(state.contributions).toHaveLength(1);
    expect(state.reviewSignals).toHaveLength(1);
    expect(state.listingUpdates).toMatchObject([{ status: "disputed" }]);
  });
});

function createInsiderReportTestDb() {
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
