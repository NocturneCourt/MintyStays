import { describe, expect, it } from "vitest";
import {
  calculateGuestSignal,
  type GuestSignalResult,
} from "@/lib/scoring/guestSignalFormula";
import {
  createCoolingExtractor,
  type AnthropicCoolingClient,
} from "@/lib/extraction/coolingExtractor";
import {
  runCoolingExtraction,
  type ExtractedScrapedSignal,
  type ExtractionStore,
  type ExtractionQuarantine,
  type RawExtractionReview,
  type StoredCoolingExtraction,
} from "@/lib/extraction/runExtraction";

describe("cooling extraction pipeline", () => {
  it("creates signals, quarantines malformed output, and recomputes Guest Signal", async () => {
    const now = new Date("2026-06-26T12:00:00Z");
    const store = createMemoryExtractionStore([
      excerpt("seed-1", "The AC got the room properly cold."),
      excerpt("seed-2", "The central air conditioning did not work."),
      excerpt("seed-3", "Powerful cooling all night."),
      excerpt("seed-4", "Breakfast was excellent."),
      excerpt("seed-5", "This AC review gets malformed model output."),
    ]);
    const extractor = createCoolingExtractor({
      client: createQueuedAnthropicClient([
        '{"mentions_cooling":true,"sentiment":"positive","ac_type_hint":null,"confidence":0.9}',
        [
          "```json",
          '{"mentions_cooling":true,"sentiment":"negative","ac_type_hint":"central","confidence":0.95}',
          "```",
        ].join("\n"),
        '{"mentions_cooling":true,"sentiment":"positive","ac_type_hint":null,"confidence":0.86}',
        "not json",
        "still not json",
      ]),
    });

    const result = await runCoolingExtraction({
      store,
      extractor,
      now,
    });

    expect(result.insertedSignals).toBe(3);
    expect(result.skippedNonCooling).toBe(1);
    expect(result.quarantined).toMatchObject([
      {
        listingId: "listing-1",
        rawReviewId: "seed-5",
      },
    ]);
    expect(store.insertedSignals).toMatchObject([
      {
        source: "scraped",
        coolingSentiment: "positive",
        rawExcerpt: "The AC got the room properly cold.",
      },
      {
        source: "scraped",
        coolingSentiment: "negative",
        acTypeHint: "central",
      },
      {
        source: "scraped",
        coolingSentiment: "positive",
        rawExcerpt: "Powerful cooling all night.",
      },
    ]);
    expect(result.listingResults[0]?.guestSignal.status).toBe("scored");
    expect(store.recomputedListingIds).toEqual(["listing-1"]);
    expect(store.savedExtractions).toHaveLength(4);
    expect(store.savedExtractions).toContainEqual(
      expect.objectContaining({
        rawReviewId: "seed-4",
        mentionsCooling: false,
        model: "keyword-prefilter",
      }),
    );
    expect(store.quarantined).toHaveLength(1);
  });
});

function excerpt(id: string, rawExcerpt: string): RawExtractionReview {
  return {
    id,
    listingId: "listing-1",
    rawExcerpt,
    authoredAt: new Date("2026-06-10T12:00:00Z"),
  };
}

function createQueuedAnthropicClient(outputs: string[]): AnthropicCoolingClient {
  const queue = [...outputs];

  return {
    messages: {
      async create() {
        const output = queue.shift();

        if (!output) {
          throw new Error("No mocked Claude output queued");
        }

        return {
          content: [
            {
              type: "text",
              text: output,
            },
          ],
        };
      },
    },
  };
}

type MemoryExtractionStore = ExtractionStore & {
  insertedSignals: ExtractedScrapedSignal[];
  savedExtractions: StoredCoolingExtraction[];
  quarantined: ExtractionQuarantine[];
  recomputedListingIds: string[];
};

function createMemoryExtractionStore(excerpts: RawExtractionReview[]) {
  const store: MemoryExtractionStore = {
    insertedSignals: [] as ExtractedScrapedSignal[],
    savedExtractions: [] as StoredCoolingExtraction[],
    quarantined: [] as ExtractionQuarantine[],
    recomputedListingIds: [] as string[],
    async loadRawReviews() {
      return excerpts;
    },
    async saveExtraction(
      extraction: StoredCoolingExtraction,
      signal?: ExtractedScrapedSignal,
    ) {
      store.savedExtractions.push(extraction);
      if (signal) {
        store.insertedSignals.push(signal);
      }
    },
    async quarantineExtraction(quarantine: ExtractionQuarantine) {
      store.quarantined.push(quarantine);
    },
    async recomputeListing(
      listingId: string,
      now: Date,
      _extractionVersion: string,
    ): Promise<GuestSignalResult> {
      store.recomputedListingIds.push(listingId);

      return calculateGuestSignal(
        store.insertedSignals.map((signal: ExtractedScrapedSignal) => ({
          source: "scraped",
          sentiment: signal.coolingSentiment,
          rawExcerpt: signal.rawExcerpt,
          authoredAt: signal.authoredAt,
        })),
        now,
      );
    },
  };

  return store;
}
