import { eq } from "drizzle-orm";
import {
  ServiceUnavailableError,
  shouldFailClosedOnDbError,
} from "@/lib/http/errors";
import { mapDbListingToPublicListing } from "./mapDbListing";
import { getSeedListings } from "./seedData";

export async function getListingDetail(id: string) {
  if (!process.env.DATABASE_URL) {
    if (shouldFailClosedOnDbError()) {
      throw new ServiceUnavailableError(
        "DATABASE_URL is required in production",
      );
    }
    return getSeedListings().find((listing) => listing.id === id) ?? null;
  }

  if (!isUuid(id)) {
    // Seed-style slug IDs are only valid on the no-DB fallback path.
    return null;
  }

  try {
    const [{ db }, { listings }] = await Promise.all([
      import("@/db/client"),
      import("@/db/schema"),
    ]);
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, id))
      .limit(1);

    if (listing) {
      return mapDbListingToPublicListing(listing);
    }

    return null;
  } catch (error) {
    if (error instanceof ServiceUnavailableError) {
      throw error;
    }

    console.error("Listing detail database query failed", error);
    throw new ServiceUnavailableError(
      "Listing data is temporarily unavailable",
    );
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
