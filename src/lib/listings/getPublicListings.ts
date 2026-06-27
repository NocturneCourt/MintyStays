import type { ListingFilters } from "./listingFilters";
import { mapDbListingToPublicListing } from "./mapDbListing";
import { getSeedListings } from "./seedData";
import type { PublicListing } from "./types";

export async function getPublicListings(filters: ListingFilters = {}) {
  const listings = await loadListings();
  return listings.filter((listing) => {
    if (!listing.evidenceSummary && listing.trustTier === "unverified") {
      return false;
    }

    if (filters.type && listing.type !== filters.type) {
      return false;
    }

    if (filters.trustTier && listing.trustTier !== filters.trustTier) {
      return false;
    }

    if (filters.minScore != null) {
      if (listing.guestSignalScore == null) return false;
      return listing.guestSignalScore >= filters.minScore;
    }

    return true;
  });
}

async function loadListings(): Promise<PublicListing[]> {
  const launchCitySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";

  if (process.env.DATABASE_URL) {
    try {
      const [{ db }, { cities, listings }, { and, eq }] = await Promise.all([
        import("@/db/client"),
        import("@/db/schema"),
        import("drizzle-orm"),
      ]);
      const rows = await db
        .select({ listing: listings })
        .from(listings)
        .innerJoin(cities, eq(listings.cityId, cities.id))
        .where(and(eq(cities.slug, launchCitySlug), eq(listings.status, "active")));

      if (rows.length) {
        return rows.map((row) => mapDbListingToPublicListing(row.listing));
      }
    } catch (error) {
      console.warn("Falling back to seed listing data", error);
    }
  }

  return getSeedListings();
}
