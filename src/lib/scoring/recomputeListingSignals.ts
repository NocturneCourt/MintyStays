import { eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { listings, reviewSignals } from "@/db/schema";
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
) {
  const signalRows = await db
    .select({
      source: reviewSignals.source,
      rawExcerpt: reviewSignals.rawExcerpt,
      coolingSentiment: reviewSignals.coolingSentiment,
      authoredAt: reviewSignals.authoredAt,
    })
    .from(reviewSignals)
    .where(eq(reviewSignals.listingId, listingId));
  const [listing] = await db
    .select({
      isHandpicked: listings.isHandpicked,
      editorScore: listings.editorScore,
      editorVerifiedAt: listings.editorVerifiedAt,
    })
    .from(listings)
    .where(eq(listings.id, listingId))
    .limit(1);

  if (!listing) {
    throw new Error(`Listing not found for recompute: ${listingId}`);
  }

  const guestSignal = calculateGuestSignal(
    signalRows.flatMap((row) => toGuestSignalInput(row)),
    now,
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
