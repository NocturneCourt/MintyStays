import { describe, expect, it } from "vitest";
import {
  cities,
  coolingExtractions,
  listings,
  rawReviews,
  reviewSignals,
} from "@/db/schema";
import {
  importListingsFromSource,
  listingUpsertSet,
  LISTING_NATURAL_KEY,
  toListingRow,
} from "@/lib/sources/importListings";
import type { ListingSourceAdapter, SeedListing } from "@/lib/sources/ListingSourceAdapter";

const seedListing: SeedListing = {
  citySlug: "lisbon",
  city: {
    name: "Lisbon",
    country: "Portugal",
    lat: 38.7223,
    lng: -9.1393,
    isActive: true,
  },
  name: "Cold Test Hotel",
  type: "hotel",
  lat: 38.72,
  lng: -9.14,
  source: "manual",
  sourceUrl: "https://www.booking.com/reviews/pt/hotel/cold-test.html",
  affiliateBaseUrl: "https://www.booking.com/hotel/pt/cold-test.html",
  evidenceSummary: "Guests report strong room cooling.",
  reviewExcerpts: [
    { text: "Cold room AC worked well.", authoredAt: "2026-06-20" },
    { text: "Strong air conditioning.", authoredAt: "2026-06-18" },
    { text: "Great cooling during heatwave.", authoredAt: "2026-06-15" },
  ],
};

describe("importListings idempotency", () => {
  it("uses (city_id, source, source_url) as the listing natural key", () => {
    expect(LISTING_NATURAL_KEY).toEqual([
      listings.cityId,
      listings.source,
      listings.sourceUrl,
    ]);
  });

  it("refreshes source fields without wiping live signal or moderation state", () => {
    const row = toListingRow(seedListing, "city-1", "manual");
    const set = listingUpsertSet(row);

    expect(set.name).toBe("Cold Test Hotel");
    expect(set).not.toHaveProperty("source");
    expect(set).not.toHaveProperty("status");
    expect(set).not.toHaveProperty("reviewNeeded");
    expect(set).not.toHaveProperty("cityId");
    expect(set).not.toHaveProperty("sourceUrl");

    for (const field of [
      "guestSignalScore",
      "guestSignalStatus",
      "guestSignalConfidence",
      "editorScore",
      "isHandpicked",
      "editorVerifiedAt",
      "trustTier",
      "reviewCountAnalyzed",
    ]) {
      expect(set).not.toHaveProperty(field);
    }
  });

  it("re-running import upserts listings and does not double review rows", async () => {
    const adapter: ListingSourceAdapter = {
      sourceName: "manual",
      async importCity() {
        return [seedListing];
      },
    };

    const state = createImportMockDb();
    const recomputeCalls: string[] = [];
    const recomputeListingSignals = async (_db: unknown, listingId: string) => {
      recomputeCalls.push(listingId);
    };

    const first = await importListingsFromSource(
      adapter,
      { citySlug: "lisbon" },
      { db: state.db as never, recomputeListingSignals },
    );

    Object.assign(state.listings[0], {
      guestSignalScore: 91,
      guestSignalStatus: "scored",
      guestSignalConfidence: "high",
      editorScore: "verified_cold",
      isHandpicked: true,
      trustTier: "editor_verified",
      reviewNeeded: true,
    });

    const second = await importListingsFromSource(
      adapter,
      { citySlug: "lisbon" },
      { db: state.db as never, recomputeListingSignals },
    );

    expect(first).toHaveLength(1);
    expect(second).toHaveLength(1);
    expect(first[0]?.id).toBe(second[0]?.id);
    expect(state.listingInserts).toBe(2);
    expect(state.listingConflictUpdates).toBe(2);
    expect(state.listings).toHaveLength(1);
    expect(state.rawReviews).toHaveLength(3);
    expect(state.coolingExtractions).toHaveLength(3);
    expect(state.reviewSignals).toHaveLength(3);
    expect(recomputeCalls).toEqual(["listing-1", "listing-1"]);
    expect(state.listings[0]).toMatchObject({
      guestSignalScore: 91,
      guestSignalStatus: "scored",
      guestSignalConfidence: "high",
      editorScore: "verified_cold",
      isHandpicked: true,
      trustTier: "editor_verified",
      reviewNeeded: true,
    });
  });
});

function createImportMockDb() {
  const state = {
    city: { id: "city-1", slug: "lisbon" } as Record<string, unknown>,
    listings: [] as Array<Record<string, unknown> & { id: string }>,
    rawReviews: [] as Array<Record<string, unknown> & { id: string }>,
    coolingExtractions: [] as Array<Record<string, unknown>>,
    reviewSignals: [] as Array<Record<string, unknown>>,
    listingInserts: 0,
    listingConflictUpdates: 0,
    db: {
      async transaction<T>(callback: (tx: unknown) => Promise<T>) {
        return callback(tx);
      },
    },
  };

  const tx = {
    insert(table: unknown) {
      return {
        values(row: Record<string, unknown>) {
          const chain = {
            onConflictDoUpdate(config: {
              target: unknown;
              set: Record<string, unknown>;
            }) {
              if (table === cities) {
                state.city = { ...state.city, ...row, ...config.set };
                return {
                  async returning() {
                    return [state.city as { id: string }];
                  },
                };
              }

              if (table === listings) {
                state.listingInserts += 1;
                state.listingConflictUpdates += 1;
                const key = `${row.cityId}|${row.source}|${row.sourceUrl}`;
                const existing = state.listings.find(
                  (listing) =>
                    `${listing.cityId}|${listing.source}|${listing.sourceUrl}` ===
                    key,
                );

                if (existing) {
                  Object.assign(existing, config.set);
                  return {
                    async returning() {
                      return [existing];
                    },
                  };
                }

                const created = {
                  id: `listing-${state.listings.length + 1}`,
                  ...row,
                };
                state.listings.push(created);
                return {
                  async returning() {
                    return [created];
                  },
                };
              }

              throw new Error("Unexpected onConflictDoUpdate target");
            },
            onConflictDoNothing() {
              if (table === rawReviews) {
                const key = `${row.listingId}|${row.contentHash}`;
                const existing = state.rawReviews.find(
                  (review) =>
                    `${review.listingId}|${review.contentHash}` === key,
                );
                if (existing) {
                  return {
                    async returning() {
                      return [];
                    },
                  };
                }
                const created = {
                  id: `raw-${state.rawReviews.length + 1}`,
                  ...row,
                };
                state.rawReviews.push(created);
                return {
                  async returning() {
                    return [created];
                  },
                };
              }

              if (table === coolingExtractions) {
                const key = `${row.rawReviewId}|${row.extractionVersion}`;
                const existing = state.coolingExtractions.find(
                  (extraction) =>
                    `${extraction.rawReviewId}|${extraction.extractionVersion}` ===
                    key,
                );
                if (!existing) {
                  state.coolingExtractions.push(row);
                }
                return {
                  async returning() {
                    return existing ? [] : [row as { id: string }];
                  },
                };
              }

              if (table === reviewSignals) {
                const existing = state.reviewSignals.find(
                  (signal) => signal.rawReviewId === row.rawReviewId,
                );
                if (!existing) {
                  state.reviewSignals.push(row);
                }
                return {
                  async returning() {
                    return existing ? [] : [row as { id: string }];
                  },
                };
              }

              throw new Error("Unexpected onConflictDoNothing target");
            },
            async returning() {
              throw new Error("Bare insert.returning is not used for listings");
            },
          };

          return chain;
        },
      };
    },
  };

  return state;
}
