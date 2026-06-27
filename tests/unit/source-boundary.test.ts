import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const allowedScraperFiles = new Set([
  join("src", "lib", "sources", "ScraperAdapter.ts"),
]);

describe("source adapter boundary", () => {
  it("keeps core logic from importing ScraperAdapter directly", async () => {
    const offenders: string[] = [];

    for (const file of await listTypeScriptFiles("src")) {
      if (allowedScraperFiles.has(file)) continue;
      const content = await readFile(file, "utf8");

      if (/ScraperAdapter/.test(content)) {
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
