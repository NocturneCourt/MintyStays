import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { describe, expect, it } from "vitest";
import { ManualImportAdapter } from "@/lib/sources/ManualImportAdapter";

describe("ManualImportAdapter", () => {
  it("imports JSON seed files with city metadata and Booking-backed rows", async () => {
    const adapter = new ManualImportAdapter();
    const listings = await adapter.importCity({
      citySlug: "lisbon",
      path: "src/db/seed/minty-launch-city.json",
    });

    expect(listings).toHaveLength(6);
    expect(listings[0].city?.name).toBe("Lisbon");
    expect(listings[0]).toMatchObject({
      name: "Lisbon Art Stay Hotel & Apartments",
      source: "manual_booking_public",
      editorial: {},
    });
  });

  it("imports CSV seed files", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mintystays-"));
    const path = join(dir, "seed.csv");
    await writeFile(
      path,
      [
        "name,type,lat,lng,source,ac_type,evidence_summary,review_excerpts",
        "Test Stay,hotel,38.7,-9.1,manual,split,Cold enough,Cold room|Strong AC",
      ].join("\n"),
      "utf8",
    );

    const listings = await new ManualImportAdapter().importCity({
      citySlug: "lisbon",
      path,
    });

    expect(listings[0]).toMatchObject({
      citySlug: "lisbon",
      name: "Test Stay",
      acType: "split",
      reviewExcerpts: [{ text: "Cold room" }, { text: "Strong AC" }],
    });
  });

  it("imports CSV review authored dates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mintystays-"));
    const path = join(dir, "seed.csv");
    await writeFile(
      path,
      [
        "name,type,lat,lng,source,review_excerpts,review_authored_dates",
        "Test Stay,hotel,38.7,-9.1,manual,Cold room|Strong AC,2026-06-20|2026-06-18",
      ].join("\n"),
      "utf8",
    );

    const listings = await new ManualImportAdapter().importCity({
      citySlug: "lisbon",
      path,
    });

    expect(listings[0].reviewExcerpts).toEqual([
      { text: "Cold room", authoredAt: "2026-06-20" },
      { text: "Strong AC", authoredAt: "2026-06-18" },
    ]);
  });

  it("imports CSV evidence provenance fields", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mintystays-"));
    const path = join(dir, "seed.csv");
    await writeFile(
      path,
      [
        "name,type,lat,lng,source,evidence_source_label,evidence_source_url,evidence_observed_at,evidence_is_paraphrased,review_excerpts",
        "Test Stay,hotel,38.7,-9.1,manual,Booking.com,https://example.com/listing,2026-06-27,true,Cools quickly|No broken AC theme",
      ].join("\n"),
      "utf8",
    );

    const listings = await new ManualImportAdapter().importCity({
      citySlug: "lisbon",
      path,
    });

    expect(listings[0].evidenceSource).toEqual({
      label: "Booking.com",
      url: "https://example.com/listing",
      observedAt: "2026-06-27",
      paraphrased: true,
    });
  });

  it("imports CSV city metadata when present", async () => {
    const dir = await mkdtemp(join(tmpdir(), "mintystays-"));
    const path = join(dir, "seed.csv");
    await writeFile(
      path,
      [
        "city_name,city_country,city_lat,city_lng,city_is_active,name,type,lat,lng,source,ac_type,evidence_summary,review_excerpts",
        "Lisbon,Portugal,38.7223,-9.1393,true,Test Stay,hotel,38.7,-9.1,manual,split,Cold enough,Cold room|Strong AC",
      ].join("\n"),
      "utf8",
    );

    const listings = await new ManualImportAdapter().importCity({
      citySlug: "lisbon",
      path,
    });

    expect(listings[0].city).toMatchObject({
      name: "Lisbon",
      country: "Portugal",
      lat: 38.7223,
      lng: -9.1393,
      isActive: true,
    });
  });
});
