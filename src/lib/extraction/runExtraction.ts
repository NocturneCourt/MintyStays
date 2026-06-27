import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import {
  reviewSignals,
  type NewReviewSignal,
} from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";
import {
  createCoolingExtractor,
  type CoolingExtractor,
} from "./coolingExtractor";
import { ClaudeJsonParseError, type CoolingExtraction } from "./parseClaudeJson";

type AcType = "split" | "central" | "portable" | "none";

export type SeededExtractionExcerpt = {
  id: string;
  listingId: string;
  rawExcerpt: string;
  acTypeHint?: AcType | null;
};

export type ExtractedScrapedSignal = {
  listingId: string;
  source: "scraped";
  rawExcerpt: string;
  coolingSentiment: "positive" | "negative" | "neutral";
  acTypeHint?: AcType;
  weight: "1.00";
  extractedAt: Date;
};

export type ExtractionQuarantine = {
  listingId: string;
  excerptId: string;
  rawExcerpt: string;
  error: string;
};

export type ExtractionStore = {
  loadSeededExcerpts(input: {
    listingIds?: string[];
  }): Promise<SeededExtractionExcerpt[]>;
  replaceScrapedSignals(
    listingId: string,
    signals: ExtractedScrapedSignal[],
  ): Promise<void>;
  recomputeListing(
    listingId: string,
    now: Date,
  ): Promise<Awaited<ReturnType<typeof recomputeListingSignals>>>;
};

export type RunExtractionInput = {
  db?: DbClient;
  store?: ExtractionStore;
  extractor?: CoolingExtractor;
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

export async function runCoolingExtraction(
  input: RunExtractionInput = {},
): Promise<RunExtractionResult> {
  const now = input.now ?? new Date();
  const store =
    input.store ?? createDrizzleExtractionStore(input.db ?? (await loadDbClient()));
  const extractor = input.extractor ?? createCoolingExtractor();
  const seededExcerpts = await store.loadSeededExcerpts({
    listingIds: input.listingIds,
  });
  const grouped = groupExcerptsByListing(seededExcerpts);
  const listingResults: RunExtractionResult["listingResults"] = [];

  for (const [listingId, excerpts] of grouped) {
    const signals: ExtractedScrapedSignal[] = [];
    const quarantined: ExtractionQuarantine[] = [];
    let skippedNonCooling = 0;

    for (const excerpt of excerpts) {
      try {
        const extracted = await extractor.extract(excerpt.rawExcerpt);

        if (!extracted.mentions_cooling) {
          skippedNonCooling += 1;
          continue;
        }

        signals.push(toReviewSignal(excerpt, extracted, now));
      } catch (error) {
        quarantined.push({
          listingId,
          excerptId: excerpt.id,
          rawExcerpt: excerpt.rawExcerpt,
          error: formatExtractionError(error),
        });
      }
    }

    await store.replaceScrapedSignals(listingId, signals);
    const guestSignal = await store.recomputeListing(listingId, now);

    listingResults.push({
      listingId,
      insertedSignals: signals.length,
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
    async loadSeededExcerpts({ listingIds }) {
      const rows = await db
        .select({
          id: reviewSignals.id,
          listingId: reviewSignals.listingId,
          rawExcerpt: reviewSignals.rawExcerpt,
          acTypeHint: reviewSignals.acTypeHint,
        })
        .from(reviewSignals)
        .where(eq(reviewSignals.source, "scraped"));
      const listingFilter = listingIds ? new Set(listingIds) : null;

      return rows.filter((row) => {
        return !listingFilter || listingFilter.has(row.listingId);
      });
    },
    async replaceScrapedSignals(listingId, signals) {
      await db
        .delete(reviewSignals)
        .where(
          and(
            eq(reviewSignals.listingId, listingId),
            eq(reviewSignals.source, "scraped"),
          ),
        );

      if (!signals.length) {
        return;
      }

      await db.insert(reviewSignals).values(signals satisfies NewReviewSignal[]);
    },
    async recomputeListing(listingId, now) {
      return recomputeListingSignals(db, listingId, now);
    },
  };
}

function groupExcerptsByListing(excerpts: SeededExtractionExcerpt[]) {
  const grouped = new Map<string, SeededExtractionExcerpt[]>();

  for (const excerpt of excerpts) {
    const listingExcerpts = grouped.get(excerpt.listingId) ?? [];
    listingExcerpts.push(excerpt);
    grouped.set(excerpt.listingId, listingExcerpts);
  }

  return grouped;
}

function toReviewSignal(
  excerpt: SeededExtractionExcerpt,
  extracted: CoolingExtraction,
  now: Date,
): ExtractedScrapedSignal {
  return {
    listingId: excerpt.listingId,
    source: "scraped",
    rawExcerpt: excerpt.rawExcerpt,
    coolingSentiment: extracted.sentiment,
    acTypeHint: extracted.ac_type_hint ?? excerpt.acTypeHint ?? undefined,
    weight: "1.00",
    extractedAt: now,
  };
}

function formatExtractionError(error: unknown) {
  if (error instanceof ClaudeJsonParseError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Unknown extraction error";
}

async function loadDbClient() {
  const { db } = await import("@/db/client");

  return db;
}
