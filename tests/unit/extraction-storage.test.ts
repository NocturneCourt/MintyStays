import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { hashReviewContent } from "@/lib/extraction/contentHash";
import { getCoolingExtractionVersion } from "@/lib/extraction/version";

describe("extraction storage", () => {
  it("uses a stable normalized content hash for review de-duplication", () => {
    expect(hashReviewContent("  Strong AC\nall night ")).toBe(
      hashReviewContent("strong ac all night"),
    );
    expect(hashReviewContent("strong ac all night")).not.toBe(
      hashReviewContent("weak ac all night"),
    );
  });

  it("keeps extraction-version changes explicit", () => {
    expect(getCoolingExtractionVersion({})).toBe("cooling-v1");
    expect(
      getCoolingExtractionVersion({ COOLING_EXTRACTION_VERSION: "cooling-v2" }),
    ).toBe("cooling-v2");
  });

  it("migrates legacy scraped signals before removing stored weights", async () => {
    const [schema, migration] = await Promise.all([
      readFile("src/db/schema.ts", "utf8"),
      readFile("src/db/migrations/0003_late_william_stryker.sql", "utf8"),
    ]);

    expect(schema).toContain('"raw_reviews"');
    expect(schema).toContain('"cooling_extractions"');
    expect(schema).not.toMatch(/\bweight:\s*numeric/);
    expect(migration).toContain('INSERT INTO "raw_reviews"');
    expect(migration).toContain('INSERT INTO "cooling_extractions"');
    expect(migration.indexOf('INSERT INTO "raw_reviews"')).toBeLessThan(
      migration.indexOf('DROP COLUMN "weight"'),
    );
  });
});
