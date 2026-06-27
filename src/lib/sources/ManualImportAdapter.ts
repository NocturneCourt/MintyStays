import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { parse } from "csv-parse/sync";
import {
  type ListingSourceAdapter,
  type SeedListing,
  seedFileSchema,
  seedListingSchema,
} from "./ListingSourceAdapter";

export class ManualImportAdapter implements ListingSourceAdapter {
  readonly sourceName = "manual";

  async importCity(input: { citySlug: string; path?: string }) {
    if (!input.path) {
      throw new Error("ManualImportAdapter requires a seed file path");
    }

    const raw = await readFile(input.path, "utf8");
    const extension = extname(input.path).toLowerCase();
    const listings =
      extension === ".csv"
        ? parseCsvSeed(raw, input.citySlug)
        : parseJsonSeed(raw, input.citySlug);

    return listings.map((listing) => seedListingSchema.parse(listing));
  }
}

function parseJsonSeed(raw: string, citySlug: string): SeedListing[] {
  const parsed = seedFileSchema.parse(JSON.parse(raw));

  if (parsed.city.slug !== citySlug) {
    throw new Error(
      `Seed city slug ${parsed.city.slug} does not match requested ${citySlug}`,
    );
  }

  return parsed.listings.map((listing) => ({
    ...listing,
    citySlug: parsed.city.slug,
    city: {
      name: parsed.city.name,
      country: parsed.city.country,
      lat: parsed.city.lat,
      lng: parsed.city.lng,
      isActive: parsed.city.isActive ?? true,
    },
  }));
}

function parseCsvSeed(raw: string, citySlug: string): SeedListing[] {
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];

  return records.map((record) =>
    seedListingSchema.parse({
      citySlug,
      city: parseCsvCity(record),
      name: record.name,
      type: record.type,
      lat: Number(record.lat),
      lng: Number(record.lng),
      address: blankToUndefined(record.address),
      source: record.source || "manual",
      sourceUrl: blankToUndefined(record.source_url),
      affiliateBaseUrl: blankToUndefined(record.affiliate_base_url),
      acType: blankToUndefined(record.ac_type),
      evidenceSummary: blankToUndefined(record.evidence_summary),
      editorial: {
        handpicked: parseBoolean(record.handpicked),
        editorVerified: parseBoolean(record.editor_verified),
        editorScore: blankToUndefined(record.editor_score),
      },
      reviewExcerpts: splitList(record.review_excerpts),
    }),
  );
}

function parseCsvCity(record: Record<string, string>) {
  const name = blankToUndefined(record.city_name);
  const country = blankToUndefined(record.city_country);
  const lat = blankToUndefined(record.city_lat);
  const lng = blankToUndefined(record.city_lng);

  if (!name && !country && !lat && !lng) {
    return undefined;
  }

  if (!name || !country || !lat || !lng) {
    throw new Error(
      "CSV city metadata requires city_name, city_country, city_lat, and city_lng",
    );
  }

  return {
    name,
    country,
    lat: Number(lat),
    lng: Number(lng),
    isActive: parseBoolean(record.city_is_active) ?? true,
  };
}

function blankToUndefined(value?: string) {
  return value?.trim() ? value.trim() : undefined;
}

function parseBoolean(value?: string) {
  if (!value) return undefined;
  return ["true", "1", "yes", "y"].includes(value.toLowerCase());
}

function splitList(value?: string) {
  if (!value?.trim()) return [];
  return value
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
}
