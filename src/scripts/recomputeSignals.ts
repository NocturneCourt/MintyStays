import { eq } from "drizzle-orm";
import { db, sql } from "@/db/client";
import { cities, listings } from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";

async function main() {
  const citySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";
  try {
    const [city] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.slug, citySlug));
    if (!city) throw new Error(`City not found: ${citySlug}`);
    const rows = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.cityId, city.id));
    const now = new Date();
    for (const listing of rows) await recomputeListingSignals(db, listing.id, now);
    console.log(`Recomputed Guest Signal for ${rows.length} listings in ${citySlug}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
