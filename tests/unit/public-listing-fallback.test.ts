import { describe, expect, it, vi } from "vitest";
import { getActiveCity } from "@/lib/cities/getActiveCity";
import { getListingDetail } from "@/lib/listings/getListingDetail";
import { getPublicListings } from "@/lib/listings/getPublicListings";

describe("public listing seed fallback", () => {
  it("loads the launch city without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(getActiveCity()).resolves.toMatchObject({
      slug: "lisbon",
      name: "Lisbon",
    });
  });

  it("loads public listings without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const listings = await getPublicListings();

    expect(listings).toHaveLength(6);
    expect(listings.every((listing) => listing.evidenceSummary)).toBe(true);
  });

  it("applies bounding boxes to seed fallback listings", async () => {
    vi.stubEnv("DATABASE_URL", "");

    const listings = await getPublicListings({
      bounds: {
        minLat: 38.71,
        maxLat: 38.713,
        minLng: -9.14,
        maxLng: -9.13,
      },
    });

    expect(listings.map((listing) => listing.name)).toEqual(["Baixa Breeze Rooms"]);
  });

  it("loads fallback listing details by seed id", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(getListingDetail("avenida-chill-hotel-1")).resolves.toMatchObject({
      name: "Avenida Chill Hotel",
      editorScore: "verified_cold",
    });
  });
});
