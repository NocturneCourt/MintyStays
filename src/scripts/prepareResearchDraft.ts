import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildResearchDraftCsvFromFile } from "@/lib/research/prepareResearchDraft";

const args = process.argv.slice(2);
const inputPath = args.find((arg) => !arg.startsWith("-"));
const outputPath = readFlagValue("--out");
const maxCandidates = Number(readFlagValue("--max-candidates") ?? 5);

async function main() {
  if (!inputPath) {
    console.error(
      "Usage: pnpm research:draft path/to/capture-manifest.json --out path/to/draft.csv",
    );
    process.exitCode = 1;
    return;
  }

  const csv = await buildResearchDraftCsvFromFile(inputPath, {
    maxCandidatesPerListing: maxCandidates,
  });

  if (!outputPath) {
    console.log(csv);
    return;
  }

  const absoluteOutputPath = resolve(process.cwd(), outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(absoluteOutputPath, `${csv}\n`, "utf8");
  console.log(`Wrote research draft: ${absoluteOutputPath}`);
  console.log("Draft rows are intentionally not seed-ready until evidence is paraphrased.");
}

function readFlagValue(flag: string) {
  const inline = args.find((arg) => arg.startsWith(`${flag}=`));
  if (inline) return inline.slice(flag.length + 1);

  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
