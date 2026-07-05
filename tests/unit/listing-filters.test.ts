import { describe, expect, it } from "vitest";
import {
  buildFilterQuery,
  parseListingFilters,
} from "@/lib/listings/listingFilters";

describe("listing filters", () => {
  it("parses valid bounding boxes from query params", () => {
    expect(
      parseListingFilters({
        minLat: "38.6",
        maxLat: "38.8",
        minLng: "-9.2",
        maxLng: "-9.1",
      }).bounds,
    ).toEqual({
      minLat: 38.6,
      maxLat: 38.8,
      minLng: -9.2,
      maxLng: -9.1,
    });
  });

  it("drops invalid bounding boxes", () => {
    expect(
      parseListingFilters({
        minLat: "38.8",
        maxLat: "38.6",
        minLng: "-9.2",
        maxLng: "-9.1",
      }).bounds,
    ).toBeUndefined();
  });

  it("preserves bounding boxes when building filter URLs", () => {
    expect(
      buildFilterQuery({
        minScore: 66,
        bounds: {
          minLat: 38.6,
          maxLat: 38.8,
          minLng: -9.2,
          maxLng: -9.1,
        },
      }),
    ).toBe("score=66&minLat=38.6&maxLat=38.8&minLng=-9.2&maxLng=-9.1");
  });
});
