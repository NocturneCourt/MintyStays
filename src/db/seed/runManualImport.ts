import { resolve } from "node:path";
import { sql } from "@/db/client";
import { ManualImportAdapter } from "@/lib/sources/ManualImportAdapter";
import { importListingsFromSource } from "@/lib/sources/importListings";

const citySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";
const seedPath =
  process.argv[2] ?? resolve(process.cwd(), "src/db/seed/minty-launch-city.json");

async function main() {
  try {
    const imported = await importListingsFromSource(new ManualImportAdapter(), {
      citySlug,
      path: seedPath,
    });

    console.log(`Imported ${imported.length} listings for ${citySlug}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
