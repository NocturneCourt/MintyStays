import { and, eq, inArray } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import {
  cities,
  coolingExtractions,
  listings,
  rawReviews,
  reviewSignals,
} from "@/db/schema";
import { getCoolingExtractionVersion } from "@/lib/extraction/version";
import {
  calculateGuestSignal,
  type GuestSignalInput,
  type ReviewSignalSource,
} from "./guestSignalFormula";
import { deriveTrustTier } from "./trustTier";

type ReviewSignalRow = {
  source: string;
  rawExcerpt: string;
  coolingSentiment: "positive" | "negative" | "neutral";
  authoredAt: Date | null;
};

export async function recomputeListingSignals(
  db: DbClient,
  listingId: string,
  now = new Date(),
  extractionVersion = getCoolingExtractionVersion(),
) {
  const extractedRows = await db
    .select({
      source: rawReviews.source,
      rawExcerpt: rawReviews.rawText,
      coolingSentiment: coolingExtractions.coolingSentiment,
      authoredAt: rawReviews.authoredAt,
    })
    .from(coolingExtractions)
    .innerJoin(rawReviews, eq(coolingExtractions.rawReviewId, rawReviews.id))
    .where(
      and(
        eq(rawReviews.listingId, listingId),
        eq(coolingExtractions.extractionVersion, extractionVersion),
        eq(coolingExtractions.mentionsCooling, true),
      ),
    );
  const contributionRows = await db
    .select({
      source: reviewSignals.source,
      rawExcerpt: reviewSignals.rawExcerpt,
      coolingSentiment: reviewSignals.coolingSentiment,
      authoredAt: reviewSignals.authoredAt,
    })
    .from(reviewSignals)
    .where(
      and(
        eq(reviewSignals.listingId, listingId),
        inArray(reviewSignals.source, ["anonymous", "insider"]),
      ),
    );
  const [listing] = await db
    .select({
      isHandpicked: listings.isHandpicked,
      editorScore: listings.editorScore,
      editorVerifiedAt: listings.editorVerifiedAt,
      cityLat: cities.lat,
    })
    .from(listings)
    .innerJoin(cities, eq(listings.cityId, cities.id))
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) {
    throw new Error(`Listing not found for recompute: ${listingId}`);
  }

  const guestSignal = calculateGuestSignal(
    [...extractedRows, ...contributionRows].flatMap((row) => toGuestSignalInput(row)),
    now,
    { cityLat: listing.cityLat },
  );

  await db
    .update(listings)
    .set({
      guestSignalScore: guestSignal.score,
      guestSignalStatus: guestSignal.status,
      guestSignalConfidence: guestSignal.confidence,
      reviewCountAnalyzed: guestSignal.coolingMentionCount,
      trustTier: deriveTrustTier({
        guestSignalStatus: guestSignal.status,
        isHandpicked: listing.isHandpicked,
        editorScore: listing.editorScore,
        editorVerifiedAt: listing.editorVerifiedAt,
      }),
      updatedAt: now,
    })
    .where(eq(listings.id, listingId));

  return guestSignal;
}

export function toGuestSignalInput(row: ReviewSignalRow): GuestSignalInput[] {
  if (!isGuestSignalSource(row.source)) {
    return [];
  }

  return [
    {
      source: row.source,
      sentiment: row.coolingSentiment,
      rawExcerpt: row.rawExcerpt,
      authoredAt: row.authoredAt,
    },
  ];
}

function isGuestSignalSource(source: string): source is ReviewSignalSource {
  return source === "scraped" || source === "anonymous" || source === "insider";
}
