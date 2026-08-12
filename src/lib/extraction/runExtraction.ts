import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import {
  coolingExtractionQuarantine,
  coolingExtractions,
  rawReviews,
  reviewSignals,
} from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";
import {
  createCoolingExtractor,
  mentionsCoolingVocabulary,
  type CoolingExtractor,
} from "./coolingExtractor";
import { getCoolingExtractionVersion } from "./version";
import { ClaudeJsonParseError, type CoolingExtraction } from "./parseClaudeJson";

type AcType = "split" | "central" | "portable" | "none";
type CoolingSentiment = "positive" | "negative" | "neutral";

export type RawExtractionReview = {
  id: string;
  listingId: string;
  rawExcerpt: string;
  authoredAt?: Date | null;
};

export type ExtractedScrapedSignal = {
  rawReviewId: string;
  listingId: string;
  source: "scraped";
  rawExcerpt: string;
  coolingSentiment: CoolingSentiment;
  acTypeHint?: AcType;
  authoredAt?: Date | null;
  extractedAt: Date;
};

export type StoredCoolingExtraction = {
  rawReviewId: string;
  extractionVersion: string;
  mentionsCooling: boolean;
  coolingSentiment: CoolingSentiment;
  acTypeHint?: AcType;
  confidence: string;
  model: string;
  extractedAt: Date;
};

export type ExtractionQuarantine = {
  listingId: string;
  rawReviewId: string;
  rawExcerpt: string;
  extractionVersion: string;
  rawOutput?: string;
  error: string;
};

export type ExtractionStore = {
  loadRawReviews(input: {
    listingIds?: string[];
    extractionVersion: string;
  }): Promise<RawExtractionReview[]>;
  saveExtraction(
    extraction: StoredCoolingExtraction,
    signal?: ExtractedScrapedSignal,
  ): Promise<void>;
  quarantineExtraction(quarantine: ExtractionQuarantine): Promise<void>;
  recomputeListing(
    listingId: string,
    now: Date,
    extractionVersion: string,
  ): Promise<Awaited<ReturnType<typeof recomputeListingSignals>>>;
};

export type RunExtractionInput = {
  db?: DbClient;
  store?: ExtractionStore;
  extractor?: CoolingExtractor;
  extractionVersion?: string;
  listingIds?: string[];
  now?: Date;
};

export type RunExtractionResult = {
  listingResults: Array<{
    listingId: string;
    insertedSignals: number;
    skippedNonCooling: number;
    quarantined: ExtractionQuarantine[];
    guestSignal: Awaited<ReturnType<typeof recomputeListingSignals>>;
  }>;
  insertedSignals: number;
  skippedNonCooling: number;
  quarantined: ExtractionQuarantine[];
};

const EXTRACTION_BATCH_SIZE = 8;

export async function runCoolingExtraction(
  input: RunExtractionInput = {},
): Promise<RunExtractionResult> {
  const now = input.now ?? new Date();
  const extractionVersion = input.extractionVersion ?? getCoolingExtractionVersion();
  const store =
    input.store ?? createDrizzleExtractionStore(input.db ?? (await loadDbClient()));
  const extractor = input.extractor ?? createCoolingExtractor();
  const rawReviewRows = await store.loadRawReviews({
    listingIds: input.listingIds,
    extractionVersion,
  });
  const grouped = groupReviewsByListing(rawReviewRows);
  const listingResults: RunExtractionResult["listingResults"] = [];

  for (const [listingId, reviews] of grouped) {
    const processed = [];

    for (const batch of batchesOf(reviews, EXTRACTION_BATCH_SIZE)) {
      processed.push(
        ...(await Promise.all(
          batch.map((review) =>
            processReview({
              review,
              extractor,
              store,
              extractionVersion,
              now,
            }),
          ),
        )),
      );
    }

    const quarantined = processed.flatMap((result) =>
      result.quarantine ? [result.quarantine] : [],
    );
    const insertedSignals = processed.filter(
      (result) => result.status === "inserted",
    ).length;
    const skippedNonCooling = processed.filter(
      (result) => result.status === "skipped",
    ).length;
    const guestSignal = await store.recomputeListing(listingId, now, extractionVersion);

    listingResults.push({
      listingId,
      insertedSignals,
      skippedNonCooling,
      quarantined,
      guestSignal,
    });
  }

  return {
    listingResults,
    insertedSignals: listingResults.reduce(
      (total, result) => total + result.insertedSignals,
      0,
    ),
    skippedNonCooling: listingResults.reduce(
      (total, result) => total + result.skippedNonCooling,
      0,
    ),
    quarantined: listingResults.flatMap((result) => result.quarantined),
  };
}

export function createDrizzleExtractionStore(db: DbClient): ExtractionStore {
  return {
    async loadRawReviews({ listingIds, extractionVersion }) {
      const rows = await db
        .select({
          id: rawReviews.id,
          listingId: rawReviews.listingId,
          rawExcerpt: rawReviews.rawText,
          authoredAt: rawReviews.authoredAt,
          cachedVersion: coolingExtractions.extractionVersion,
        })
        .from(rawReviews)
        .leftJoin(
          coolingExtractions,
          and(
            eq(coolingExtractions.rawReviewId, rawReviews.id),
            eq(coolingExtractions.extractionVersion, extractionVersion),
          ),
        );
      const listingFilter = listingIds ? new Set(listingIds) : null;

      return rows
        .filter((row) => {
          return (
            row.cachedVersion == null &&
            (!listingFilter || listingFilter.has(row.listingId))
          );
        })
        .map(({ cachedVersion: _cachedVersion, ...row }) => row);
    },
    async saveExtraction(extraction, signal) {
      await db.transaction(async (tx) => {
        await tx.insert(coolingExtractions).values(extraction).onConflictDoNothing();
        await tx
          .delete(coolingExtractionQuarantine)
          .where(
            and(
              eq(coolingExtractionQuarantine.rawReviewId, extraction.rawReviewId),
              eq(
                coolingExtractionQuarantine.extractionVersion,
                extraction.extractionVersion,
              ),
            ),
          );

        if (signal) {
          await tx
            .insert(reviewSignals)
            .values(signal)
            .onConflictDoUpdate({
              target: reviewSignals.rawReviewId,
              set: {
                rawExcerpt: signal.rawExcerpt,
                coolingSentiment: signal.coolingSentiment,
                acTypeHint: signal.acTypeHint,
                authoredAt: signal.authoredAt,
                extractedAt: signal.extractedAt,
              },
            });
        } else {
          await tx
            .delete(reviewSignals)
            .where(eq(reviewSignals.rawReviewId, extraction.rawReviewId));
        }
      });
    },
    async quarantineExtraction(quarantine) {
      await db
        .insert(coolingExtractionQuarantine)
        .values({
          rawReviewId: quarantine.rawReviewId,
          extractionVersion: quarantine.extractionVersion,
          rawOutput: quarantine.rawOutput,
          error: quarantine.error,
        })
        .onConflictDoUpdate({
          target: [
            coolingExtractionQuarantine.rawReviewId,
            coolingExtractionQuarantine.extractionVersion,
          ],
          set: {
            rawOutput: quarantine.rawOutput,
            error: quarantine.error,
            createdAt: new Date(),
          },
        });
    },
    async recomputeListing(listingId, now, extractionVersion) {
      return recomputeListingSignals(db, listingId, now, extractionVersion);
    },
  };
}

async function processReview({
  review,
  extractor,
  store,
  extractionVersion,
  now,
}: {
  review: RawExtractionReview;
  extractor: CoolingExtractor;
  store: ExtractionStore;
  extractionVersion: string;
  now: Date;
}): Promise<
  | { status: "inserted" | "skipped"; quarantine?: never }
  | { status: "quarantined"; quarantine: ExtractionQuarantine }
> {
  try {
    const extracted = mentionsCoolingVocabulary(review.rawExcerpt)
      ? await extractor.extract(review.rawExcerpt)
      : nonCoolingPrefilterResult();
    const extraction = toStoredExtraction(
      review,
      extracted,
      extractionVersion,
      mentionsCoolingVocabulary(review.rawExcerpt)
        ? (extractor.model ?? "custom-extractor")
        : "keyword-prefilter",
      now,
    );
    const signal = extracted.mentions_cooling
      ? toReviewSignal(review, extracted, now)
      : undefined;

    await store.saveExtraction(extraction, signal);

    return { status: signal ? "inserted" : "skipped" };
  } catch (error) {
    const quarantine = toQuarantine(review, extractionVersion, error);
    await store.quarantineExtraction(quarantine);

    return { status: "quarantined", quarantine };
  }
}

function groupReviewsByListing(reviews: RawExtractionReview[]) {
  const grouped = new Map<string, RawExtractionReview[]>();

  for (const review of reviews) {
    const listingReviews = grouped.get(review.listingId) ?? [];
    listingReviews.push(review);
    grouped.set(review.listingId, listingReviews);
  }

  return grouped;
}

function toStoredExtraction(
  review: RawExtractionReview,
  extracted: CoolingExtraction,
  extractionVersion: string,
  model: string,
  now: Date,
): StoredCoolingExtraction {
  return {
    rawReviewId: review.id,
    extractionVersion,
    mentionsCooling: extracted.mentions_cooling,
    coolingSentiment: extracted.sentiment,
    acTypeHint: extracted.ac_type_hint ?? undefined,
    confidence: extracted.confidence.toFixed(3),
    model,
    extractedAt: now,
  };
}

function toReviewSignal(
  review: RawExtractionReview,
  extracted: CoolingExtraction,
  now: Date,
): ExtractedScrapedSignal {
  return {
    rawReviewId: review.id,
    listingId: review.listingId,
    source: "scraped",
    rawExcerpt: review.rawExcerpt,
    coolingSentiment: extracted.sentiment,
    acTypeHint: extracted.ac_type_hint ?? undefined,
    authoredAt: review.authoredAt ?? null,
    extractedAt: now,
  };
}

function nonCoolingPrefilterResult(): CoolingExtraction {
  return {
    mentions_cooling: false,
    sentiment: "neutral",
    ac_type_hint: null,
    confidence: 1,
  };
}

function toQuarantine(
  review: RawExtractionReview,
  extractionVersion: string,
  error: unknown,
): ExtractionQuarantine {
  return {
    listingId: review.listingId,
    rawReviewId: review.id,
    rawExcerpt: review.rawExcerpt,
    extractionVersion,
    rawOutput: error instanceof ClaudeJsonParseError ? error.rawOutput : undefined,
    error: error instanceof Error ? error.message : "Unknown extraction error",
  };
}

function batchesOf<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

async function loadDbClient() {
  const { db } = await import("@/db/client");

  return db;
}
