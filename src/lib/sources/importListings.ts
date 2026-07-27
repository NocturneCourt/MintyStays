import {
  cities,
  coolingExtractions,
  listings,
  rawReviews,
  reviewSignals,
  type NewListing,
} from "@/db/schema";
import { hashReviewContent } from "@/lib/extraction/contentHash";
import { getCoolingExtractionVersion } from "@/lib/extraction/version";
import { calculateGuestSignal } from "@/lib/scoring/guestSignalFormula";
import { inferCoolingSentiment } from "@/lib/scoring/inferCoolingSentiment";
import { deriveTrustTier } from "@/lib/scoring/trustTier";
import type { ListingSourceAdapter, SeedListing } from "./ListingSourceAdapter";

/** Natural key for idempotent seed/import: one row per city + source + source URL. */
export const LISTING_NATURAL_KEY = [
  listings.cityId,
  listings.source,
  listings.sourceUrl,
] as const;

type ImportDb = {
  transaction: <T>(
    callback: (tx: ImportTransaction) => Promise<T>,
  ) => Promise<T>;
};

type ImportTransaction = {
  insert: (table: unknown) => {
    values: (row: Record<string, unknown> | NewListing) => {
      onConflictDoUpdate: (config: {
        target: unknown;
        set: Record<string, unknown>;
      }) => {
        returning: () => Promise<Array<Record<string, unknown> & { id: string }>>;
      };
      onConflictDoNothing: (config?: { target?: unknown }) => {
        returning: () => Promise<Array<Record<string, unknown> & { id: string }>>;
      };
      returning: () => Promise<Array<Record<string, unknown> & { id: string }>>;
    };
  };
};

export async function importListingsFromSource(
  adapter: ListingSourceAdapter,
  input: { citySlug: string; path?: string },
  // Accept any drizzle-compatible client; narrowed at call sites / mocks.
  options: { db?: { transaction: ImportDb["transaction"] } | ImportDb } = {},
) {
  const seedListings = await adapter.importCity(input);
  const database = (options.db ?? (await loadDefaultDb())) as ImportDb;

  return database.transaction(async (tx) => {
    const city = seedListings[0]?.city;

    if (!city) {
      throw new Error("Manual seed data must include city metadata");
    }

    const [upsertedCity] = await tx
      .insert(cities)
      .values({
        slug: input.citySlug,
        name: city.name,
        country: city.country,
        lat: city.lat,
        lng: city.lng,
        isActive: city.isActive ?? true,
      })
      .onConflictDoUpdate({
        target: cities.slug,
        set: {
          name: city.name,
          country: city.country,
          lat: city.lat,
          lng: city.lng,
          isActive: city.isActive ?? true,
          updatedAt: new Date(),
        },
      })
      .returning();

    const imported = [];

    for (const seedListing of seedListings) {
      const newListing = toListingRow(
        seedListing,
        upsertedCity.id,
        adapter.sourceName,
      );
      const [upsertedListing] = await tx
        .insert(listings)
        .values(newListing)
        .onConflictDoUpdate({
          target: [...LISTING_NATURAL_KEY],
          set: listingUpsertSet(newListing),
        })
        .returning();

      for (const excerpt of seedListing.reviewExcerpts) {
        const authoredAt = parseSeedDate(excerpt.authoredAt);
        const [rawReview] = await tx
          .insert(rawReviews)
          .values({
            listingId: upsertedListing.id,
            source: "scraped",
            sourceUrl: seedListing.sourceUrl,
            contentHash: hashReviewContent(excerpt.text),
            rawText: excerpt.text,
            authoredAt,
            collectedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [rawReviews.listingId, rawReviews.contentHash],
          })
          .returning();

        // Already imported this review content for the listing.
        if (!rawReview) {
          continue;
        }

        const coolingSentiment = inferCoolingSentiment(excerpt.text);

        await tx
          .insert(coolingExtractions)
          .values({
            rawReviewId: rawReview.id,
            extractionVersion: getCoolingExtractionVersion(),
            mentionsCooling: true,
            coolingSentiment,
            acTypeHint: seedListing.acType,
            confidence: "1.000",
            model: "manual-import-deterministic",
            extractedAt: new Date(),
          })
          .onConflictDoNothing({
            target: [
              coolingExtractions.rawReviewId,
              coolingExtractions.extractionVersion,
            ],
          })
          .returning();

        await tx
          .insert(reviewSignals)
          .values({
            listingId: upsertedListing.id,
            rawReviewId: rawReview.id,
            source: "scraped",
            rawExcerpt: excerpt.text,
            coolingSentiment,
            acTypeHint: seedListing.acType,
            authoredAt,
            extractedAt: new Date(),
          })
          .onConflictDoNothing({
            target: reviewSignals.rawReviewId,
          })
          .returning();
      }

      imported.push(upsertedListing);
    }

    return imported;
  });
}

/** Fields refreshed on re-seed; leaves status/reviewNeeded for editorial ops. */
export function listingUpsertSet(newListing: NewListing) {
  return {
    name: newListing.name,
    type: newListing.type,
    lat: newListing.lat,
    lng: newListing.lng,
    address: newListing.address,
    affiliateUrl: newListing.affiliateUrl,
    acType: newListing.acType,
    guestSignalScore: newListing.guestSignalScore,
    guestSignalStatus: newListing.guestSignalStatus,
    guestSignalConfidence: newListing.guestSignalConfidence,
    editorScore: newListing.editorScore,
    isHandpicked: newListing.isHandpicked,
    editorVerifiedAt: newListing.editorVerifiedAt,
    trustTier: newListing.trustTier,
    evidenceSummary: newListing.evidenceSummary,
    reviewCountAnalyzed: newListing.reviewCountAnalyzed,
    lastSeededAt: newListing.lastSeededAt,
    updatedAt: new Date(),
  };
}

export function toListingRow(
  seedListing: SeedListing,
  cityId: string,
  sourceName: string,
): NewListing {
  const editorVerifiedAt = seedListing.editorial?.editorVerified
    ? new Date()
    : undefined;
  const guestSignal = calculateGuestSignal(
    seedListing.reviewExcerpts.map((excerpt) => ({
      source: "scraped",
      sentiment: inferCoolingSentiment(excerpt.text),
      rawExcerpt: excerpt.text,
      authoredAt: parseSeedDate(excerpt.authoredAt),
    })),
  );

  return {
    name: seedListing.name,
    type: seedListing.type,
    lat: seedListing.lat,
    lng: seedListing.lng,
    cityId,
    address: seedListing.address,
    source: sourceName,
    sourceUrl: seedListing.sourceUrl,
    affiliateUrl: seedListing.affiliateBaseUrl,
    acType: seedListing.acType,
    guestSignalScore: guestSignal.score,
    guestSignalStatus: guestSignal.status,
    guestSignalConfidence: guestSignal.confidence,
    editorScore: seedListing.editorial?.editorScore,
    isHandpicked: seedListing.editorial?.handpicked ?? false,
    editorVerifiedAt,
    trustTier: deriveTrustTier({
      guestSignalStatus: guestSignal.status,
      isHandpicked: seedListing.editorial?.handpicked,
      editorScore: seedListing.editorial?.editorScore,
      editorVerifiedAt,
    }),
    evidenceSummary: seedListing.evidenceSummary,
    reviewCountAnalyzed: seedListing.reviewExcerpts.length,
    lastSeededAt: new Date(),
    status: "active",
  };
}

function parseSeedDate(value?: string) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

async function loadDefaultDb(): Promise<ImportDb> {
  const { db } = await import("@/db/client");
  return db as unknown as ImportDb;
}
