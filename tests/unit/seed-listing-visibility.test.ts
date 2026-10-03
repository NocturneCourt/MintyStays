import { afterEach, describe, expect, it, vi } from "vitest";
import rawSeed from "@/db/seed/minty-launch-city.json";
import type { SeedFile } from "@/lib/sources/ListingSourceAdapter";

afterEach(() => {
  vi.doUnmock("@/db/seed/minty-launch-city.json");
  vi.resetModules();
});

const listing: SeedFile["listings"][number] = {
  name: "Visibility test stay",
  type: "hotel",
  lat: 38.7,
  lng: -9.1,
  source: "manual",
  reviewExcerpts: [],
};

describe("seed listing visibility", () => {
  it("excludes listings with only non-cooling reviews and no editorial evidence", async () => {
    const listings = await loadSeedListings([
      { ...listing, reviewExcerpts: [{ text: "Breakfast was excellent." }] },
      {
        ...listing,
        evidenceSummary: "   ",
        reviewExcerpts: [{ text: "The staff were helpful." }],
      },
      { ...listing },
      { ...listing, editorial: { editorVerified: true } },
    ]);

    expect(listings).toEqual([]);
  });

  it("keeps cooling-only evidence eligible without inflating the mention count", async () => {
    const listings = await loadSeedListings([
      {
        ...listing,
        reviewExcerpts: [
          { text: "The AC cooled the bedroom quickly.", authoredAt: "2026-06-15" },
          { text: "Breakfast was excellent." },
        ],
      },
    ]);

    expect(listings).toHaveLength(1);
    expect(listings[0]).toMatchObject({
      id: "visibility-test-stay-1",
      reviewCountAnalyzed: 1,
      guestSignalStatus: "unverified",
      guestSignalScore: null,
      editorScore: null,
    });
    expect(listings[0].evidenceSummary).toContain("Cooling evidence exists");
  });

  it("keeps evidence summaries and distinct editorial statuses eligible", async () => {
    const listings = await loadSeedListings([
      { ...listing, evidenceSummary: "An AC unit is documented." },
      { ...listing, editorial: { handpicked: true } },
      { ...listing, editorial: { editorVerified: true, editorScore: "verified_cold" } },
    ]);

    expect(listings.map((value) => value.trustTier)).toEqual([
      "unverified",
      "handpicked",
      "editor_verified",
    ]);
    expect(listings.every((value) => value.guestSignalScore === null)).toBe(true);
    expect(listings.map((value) => value.editorScore)).toEqual([
      null,
      null,
      "verified_cold",
    ]);
  });

  it("preserves the current valid fixture IDs when an ineligible listing is inserted", async () => {
    vi.resetModules();
    const { getSeedListings } = await import("@/lib/listings/seedData");
    const current = getSeedListings();
    const listings = await loadSeedListings([
      { ...listing, reviewExcerpts: [{ text: "Breakfast was excellent." }] },
      ...(rawSeed.listings as SeedFile["listings"]),
    ]);

    expect(listings).toEqual(current);
  });
});

async function loadSeedListings(listings: SeedFile["listings"]) {
  vi.resetModules();
  vi.doMock("@/db/seed/minty-launch-city.json", () => ({
    default: { city: rawSeed.city, listings },
  }));
  const { getSeedListings } = await import("@/lib/listings/seedData");
  return getSeedListings();
}
