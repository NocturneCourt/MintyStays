import { db } from "@/db/client";
import {
  cities,
  listings,
  reviewSignals,
  type NewListing,
  type NewReviewSignal,
} from "@/db/schema";
import { calculateGuestSignal } from "@/lib/scoring/guestSignalFormula";
import { inferCoolingSentiment } from "@/lib/scoring/inferCoolingSentiment";
import { deriveTrustTier } from "@/lib/scoring/trustTier";
import type { ListingSourceAdapter, SeedListing } from "./ListingSourceAdapter";

export async function importListingsFromSource(
  adapter: ListingSourceAdapter,
  input: { citySlug: string; path?: string },
) {
  const seedListings = await adapter.importCity(input);

  return db.transaction(async (tx) => {
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
      const newListing = toListingRow(seedListing, upsertedCity.id, adapter.sourceName);
      const [insertedListing] = await tx
        .insert(listings)
        .values(newListing)
        .returning();

      const signals = toReviewSignals(seedListing, insertedListing.id);
      if (signals.length) {
        await tx.insert(reviewSignals).values(signals);
      }

      imported.push(insertedListing);
    }

    return imported;
  });
}

function toListingRow(
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

function toReviewSignals(seedListing: SeedListing, listingId: string): NewReviewSignal[] {
  return seedListing.reviewExcerpts.map((excerpt) => ({
    listingId,
    source: "scraped",
    rawExcerpt: excerpt.text,
    coolingSentiment: inferCoolingSentiment(excerpt.text),
    acTypeHint: seedListing.acType,
    weight: "1.00",
    authoredAt: parseSeedDate(excerpt.authoredAt),
    extractedAt: new Date(),
  }));
}

function parseSeedDate(value?: string) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}
