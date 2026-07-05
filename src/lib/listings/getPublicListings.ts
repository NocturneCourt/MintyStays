import type { ListingFilters } from "./listingFilters";
import { mapDbListingToPublicListing } from "./mapDbListing";
import { getSeedListings } from "./seedData";
import type { PublicListing } from "./types";

export async function getPublicListings(filters: ListingFilters = {}) {
  const listings = await loadListings(filters);
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

    if (filters.bounds && !isInsideBounds(listing, filters.bounds)) {
      return false;
    }

    if (filters.minScore != null) {
      if (listing.guestSignalScore == null) return false;
      return listing.guestSignalScore >= filters.minScore;
    }

    return true;
  });
}

async function loadListings(filters: ListingFilters): Promise<PublicListing[]> {
  const launchCitySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";

  if (process.env.DATABASE_URL) {
    try {
      const [
        { db },
        { cities, listings },
        { and, eq, gte, lte, ne, or, sql },
      ] = await Promise.all([
        import("@/db/client"),
        import("@/db/schema"),
        import("drizzle-orm"),
      ]);

      const [city] = await db
        .select({ id: cities.id, lat: cities.lat, lng: cities.lng })
        .from(cities)
        .where(eq(cities.slug, launchCitySlug))
        .limit(1);

      if (!city) {
        return [];
      }

      const bounds = filters.bounds ?? defaultBounds(city.lat, city.lng);
      const conditions = [
        eq(listings.cityId, city.id),
        eq(listings.status, "active"),
        gte(listings.lat, bounds.minLat),
        lte(listings.lat, bounds.maxLat),
        gte(listings.lng, bounds.minLng),
        lte(listings.lng, bounds.maxLng),
        or(
          sql`${listings.evidenceSummary} IS NOT NULL AND btrim(${listings.evidenceSummary}) <> ''`,
          ne(listings.trustTier, "unverified"),
        ),
      ];

      if (filters.type) {
        conditions.push(eq(listings.type, filters.type));
      }

      if (filters.trustTier) {
        conditions.push(eq(listings.trustTier, filters.trustTier));
      }

      if (filters.minScore != null) {
        conditions.push(gte(listings.guestSignalScore, filters.minScore));
      }

      const rows = await db
        .select({ listing: listings })
        .from(listings)
        .where(and(...conditions));

      return rows.map((row) => mapDbListingToPublicListing(row.listing));
    } catch (error) {
      console.warn("Falling back to seed listing data", error);
    }
  }

  return getSeedListings();
}

function defaultBounds(lat: number, lng: number) {
  return {
    minLat: Math.max(-90, lat - 0.35),
    maxLat: Math.min(90, lat + 0.35),
    minLng: Math.max(-180, lng - 0.45),
    maxLng: Math.min(180, lng + 0.45),
  };
}

function isInsideBounds(
  listing: PublicListing,
  bounds: NonNullable<ListingFilters["bounds"]>,
) {
  return (
    listing.lat >= bounds.minLat &&
    listing.lat <= bounds.maxLat &&
    listing.lng >= bounds.minLng &&
    listing.lng <= bounds.maxLng
  );
}
