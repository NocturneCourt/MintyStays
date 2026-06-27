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

    expect(listings).toHaveLength(3);
    expect(listings.every((listing) => listing.evidenceSummary)).toBe(true);
  });

  it("loads fallback listing details by seed id", async () => {
    vi.stubEnv("DATABASE_URL", "");

    await expect(getListingDetail("avenida-chill-hotel-1")).resolves.toMatchObject({
      name: "Avenida Chill Hotel",
      editorScore: "verified_cold",
    });
  });
});
