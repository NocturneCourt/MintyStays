import { describe, expect, it } from "vitest";
import {
  calculateGuestSignal,
  recencyWeight,
  seasonalityWeight,
  type GuestSignalInput,
} from "@/lib/scoring/guestSignalFormula";

const now = new Date("2026-06-26T12:00:00Z");
const recent = new Date("2026-06-01T12:00:00Z");

function signal(overrides: Partial<GuestSignalInput> = {}): GuestSignalInput {
  return {
    source: "scraped",
    sentiment: "positive",
    authoredAt: recent,
    rawExcerpt: "The room got properly cold.",
    ...overrides,
  };
}

describe("calculateGuestSignal", () => {
  it("returns unverified with no number below three cooling mentions", () => {
    const result = calculateGuestSignal([signal(), signal()], now);

    expect(result.status).toBe("unverified");
    expect(result.score).toBeNull();
    expect(result.coolingMentionCount).toBe(2);
  });

  it("computes a scored 0-100 signal at three or more mentions", () => {
    const result = calculateGuestSignal([signal(), signal(), signal()], now);

    expect(result.status).toBe("scored");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("weights newer signals above older signals", () => {
    expect(recencyWeight(new Date("2026-06-01T00:00:00Z"), now)).toBeGreaterThan(
      recencyWeight(new Date("2025-09-01T00:00:00Z"), now),
    );
    expect(recencyWeight(new Date("2025-09-01T00:00:00Z"), now)).toBeGreaterThan(
      recencyWeight(new Date("2025-01-01T00:00:00Z"), now),
    );
    expect(recencyWeight(new Date("2025-01-01T00:00:00Z"), now)).toBeGreaterThan(
      recencyWeight(new Date("2023-01-01T00:00:00Z"), now),
    );
  });

  it("down-weights off-season cooling mentions", () => {
    expect(seasonalityWeight(new Date("2026-07-01T00:00:00Z"), 38.7)).toBe(1);
    expect(seasonalityWeight(new Date("2026-01-01T00:00:00Z"), 38.7)).toBe(0.2);
    expect(seasonalityWeight(new Date("2026-01-01T00:00:00Z"), -33.9)).toBe(1);
  });

  it("applies a hard penalty for trailing broken AC mentions", () => {
    const healthy = calculateGuestSignal(
      [signal(), signal(), signal(), signal()],
      now,
    );
    const broken = calculateGuestSignal(
      [
        signal(),
        signal(),
        signal(),
        signal({
          sentiment: "negative",
          rawExcerpt: "The AC did not work during our stay.",
        }),
      ],
      now,
    );

    expect(broken.status).toBe("scored");
    expect(healthy.status).toBe("scored");
    if (broken.status !== "scored" || healthy.status !== "scored") {
      throw new Error("Expected scored results");
    }
    expect(broken.brokenPenaltyApplied).toBe(true);
    expect(broken.score).toBeLessThan(healthy.score);
  });

  it("discounts tiny samples against larger solid samples", () => {
    const tiny = calculateGuestSignal([signal(), signal(), signal()], now);
    const larger = calculateGuestSignal(Array.from({ length: 12 }, () => signal()), now);

    expect(tiny.status).toBe("scored");
    expect(larger.status).toBe("scored");
    if (tiny.status !== "scored" || larger.status !== "scored") {
      throw new Error("Expected scored results");
    }
    expect(larger.score).toBeGreaterThan(tiny.score);
    expect(tiny.confidence).toBe("low");
  });
});
