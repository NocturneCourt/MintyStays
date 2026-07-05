import { resolve } from "node:path";
import { ManualImportAdapter } from "@/lib/sources/ManualImportAdapter";
import { validateSeedListings } from "@/lib/sources/validateSeedListings";

const args = process.argv.slice(2);
const strict = args.includes("--strict");
const seedPathArg = args.find((arg) => !arg.startsWith("-"));
const citySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";
const seedPath = resolve(
  process.cwd(),
  seedPathArg ?? "src/db/seed/minty-launch-city.json",
);

async function main() {
  const adapter = new ManualImportAdapter();
  const listings = await adapter.importCity({ citySlug, path: seedPath });
  const result = validateSeedListings(listings, { strict });

  console.log("MintyStays seed validation");
  console.log(`Seed: ${seedPath}`);
  console.log(`City: ${citySlug}`);
  console.log(`Listings: ${result.listingCount}`);
  console.log(`Review excerpts: ${result.reviewExcerptCount}`);
  console.log(`Evidence-backed listings: ${result.evidenceBackedListingCount}`);
  console.log(`Editorial listings: ${result.editorialListingCount}`);

  for (const warning of result.warnings) {
    console.warn(formatIssue(warning));
  }

  for (const error of result.errors) {
    console.error(formatIssue(error));
  }

  if (!result.ok) {
    process.exitCode = 1;
  }
}

function formatIssue(issue: { severity: string; listingName?: string; message: string }) {
  const listing = issue.listingName ? ` [${issue.listingName}]` : "";
  return `${issue.severity}:${listing} ${issue.message}`;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
