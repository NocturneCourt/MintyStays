import { describe, expect, it } from "vitest";
import type { SeedListing } from "@/lib/sources/ListingSourceAdapter";
import { ManualImportAdapter } from "@/lib/sources/ManualImportAdapter";
import { validateSeedListings } from "@/lib/sources/validateSeedListings";

const validListing: SeedListing = {
  citySlug: "lisbon",
  city: {
    name: "Lisbon",
    country: "Portugal",
    lat: 38.7223,
    lng: -9.1393,
  },
  name: "Cold Test Hotel",
  type: "hotel",
  lat: 38.72,
  lng: -9.14,
  source: "manual",
  sourceUrl: "https://www.booking.com/reviews/pt/hotel/cold-test.html",
  affiliateBaseUrl: "https://www.booking.com/hotel/pt/cold-test.html",
  evidenceSummary: "Guests repeatedly report strong room cooling.",
  evidenceSource: {
    label: "Manual research",
    url: "https://www.booking.com/reviews/pt/hotel/cold-test.html",
    observedAt: "2026-06-27",
    paraphrased: true,
  },
  reviewExcerpts: [
    { text: "Cold room", authoredAt: "2026-06-20" },
    { text: "Strong AC", authoredAt: "2026-06-18" },
    { text: "Great cooling", authoredAt: "2026-06-15" },
  ],
};

describe("validateSeedListings", () => {
  it("accepts the launch seed file", async () => {
    const listings = await new ManualImportAdapter().importCity({
      citySlug: "lisbon",
      path: "src/db/seed/minty-launch-city.json",
    });

    const result = validateSeedListings(listings, { strict: true });

    expect(result.ok).toBe(true);
    expect(result.listingCount).toBe(6);
    expect(result.reviewExcerptCount).toBe(7);
  });

  it("requires city metadata and at least one listing", () => {
    const result = validateSeedListings([]);

    expect(result.ok).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining(["seed.empty", "city.missing_metadata"]),
    );
  });

  it("blocks public empty pins", () => {
    const result = validateSeedListings([
      {
        ...validListing,
        evidenceSummary: undefined,
        reviewExcerpts: [],
        editorial: undefined,
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("listing.empty_pin");
  });

  it("keeps Editor Score tied to editor verification", () => {
    const result = validateSeedListings([
      {
        ...validListing,
        editorial: { editorScore: "verified_cold" },
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("editorial.score_without_verification");
  });

  it("treats missing affiliate URLs as strict failures", () => {
    const result = validateSeedListings(
      [{ ...validListing, affiliateBaseUrl: undefined }],
      { strict: true },
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("listing.missing_affiliate_url");
  });

  it("treats placeholder source URLs as strict failures", () => {
    const result = validateSeedListings(
      [
        {
          ...validListing,
          sourceUrl: "https://example.com/listing",
        },
      ],
      { strict: true },
    );

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("listing.placeholder_url");
  });

  it("requires paraphrased evidence confirmation in strict mode", () => {
    const result = validateSeedListings(
      [{ ...validListing, evidenceSource: undefined }],
      { strict: true },
    );

    expect(result.ok).toBe(false);
    expect(result.errors.map((issue) => issue.code)).toEqual(
      expect.arrayContaining([
        "evidence.paraphrase_unconfirmed",
        "evidence.missing_observed_at",
      ]),
    );
  });

  it("rejects evidence marked as not paraphrased", () => {
    const result = validateSeedListings([
      {
        ...validListing,
        evidenceSource: {
          ...validListing.evidenceSource,
          paraphrased: false,
        },
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("evidence.not_paraphrased");
  });

  it("rejects unreviewed draft evidence even without review excerpts", () => {
    const result = validateSeedListings([
      {
        ...validListing,
        evidenceSummary: "DRAFT ONLY: no cooling candidate found in capture.",
        evidenceSource: {
          label: "Tool-assisted research capture",
          url: "https://research.example.test/listing",
          observedAt: "2026-07-02",
          paraphrased: false,
        },
        reviewExcerpts: [],
      },
    ]);

    expect(result.ok).toBe(false);
    expect(result.errors[0].code).toBe("evidence.not_paraphrased");
  });
});
