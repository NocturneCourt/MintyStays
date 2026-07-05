import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const forbiddenScoreField = /\b(?:overall|blended|combined|merged)(?:Cooling)?Score\b/i;

describe("no-blend score guard", () => {
  it("keeps schema, DTOs, and public APIs from adding a blended cooling score", async () => {
    const files = [
      "src/db/schema.ts",
      "src/lib/listings/types.ts",
      "src/lib/design/coldIndex.ts",
      "src/components/listing/ScoreRows.tsx",
      ...(await listTypeScriptFiles("src/app/api")),
    ];
    const offenders: string[] = [];

    for (const file of files) {
      const content = await readFile(file, "utf8");
      if (forbiddenScoreField.test(content)) {
        offenders.push(file);
      }
    }

    expect(offenders).toEqual([]);
  });
});

async function listTypeScriptFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const path = join(root, entry.name);
      if (entry.isDirectory()) return listTypeScriptFiles(path);
      if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) return [path];
      return [];
    }),
  );

  return files.flat();
}
