import { eq } from "drizzle-orm";
import { mapDbListingToPublicListing } from "./mapDbListing";
import { getSeedListings } from "./seedData";

export async function getListingDetail(id: string) {
  if (process.env.DATABASE_URL && isUuid(id)) {
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
    } catch (error) {
      console.warn("Falling back to seed listing detail", error);
    }
  }

  return getSeedListings().find((listing) => listing.id === id) ?? null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
