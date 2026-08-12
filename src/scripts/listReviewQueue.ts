import { desc, eq } from "drizzle-orm";
import { sql } from "@/db/client";

async function main() {
  const [{ db }, { cities, listings }] = await Promise.all([
    import("@/db/client"),
    import("@/db/schema"),
  ]);

  try {
    const rows = await db
      .select({
        id: listings.id,
        name: listings.name,
        city: cities.name,
        guestSignalScore: listings.guestSignalScore,
        editorScore: listings.editorScore,
        updatedAt: listings.updatedAt,
      })
      .from(listings)
      .innerJoin(cities, eq(listings.cityId, cities.id))
      .where(eq(listings.reviewNeeded, true))
      .orderBy(desc(listings.updatedAt));

    if (!rows.length) {
      console.log("No listings are waiting for cooling review.");
      return;
    }

    console.table(
      rows.map((row) => ({
        ...row,
        updatedAt: row.updatedAt.toISOString(),
      })),
    );
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
