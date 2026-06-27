export type ReviewSignalSource = "scraped" | "anonymous" | "insider";
export type CoolingSentiment = "positive" | "negative" | "neutral";

export type GuestSignalInput = {
  source: ReviewSignalSource;
  sentiment: CoolingSentiment;
  extractedAt: Date;
  rawExcerpt?: string | null;
  vote?: "confirm_cold" | "dispute_weak" | "broken";
};

export type GuestSignalResult =
  | {
      status: "unverified";
      score: null;
      coolingMentionCount: number;
      brokenPenaltyApplied: false;
    }
  | {
      status: "scored";
      score: number;
      coolingMentionCount: number;
      brokenPenaltyApplied: boolean;
      weightedPositive: number;
      weightedTotal: number;
    };

const PRIOR_RATIO = 0.55;
const PRIOR_STRENGTH = 8;
const BROKEN_PENALTY = 35;

const SOURCE_WEIGHTS: Record<ReviewSignalSource, number> = {
  scraped: 1,
  anonymous: 1.25,
  insider: 2.5,
};

const BROKEN_AC_PATTERNS = [
  /\bac\s+(was\s+)?broken\b/i,
  /\bair\s+conditioning\s+(was\s+)?broken\b/i,
  /\bbroken\s+(ac|a\/c|air\s+conditioning)\b/i,
  /\bac\s+(did\s+not|didn't|does\s+not|doesn't)\s+work\b/i,
  /\bair\s+conditioning\s+(did\s+not|didn't|does\s+not|doesn't)\s+work\b/i,
  /\bno\s+working\s+ac\b/i,
  /\bwithout\s+working\s+ac\b/i,
];

export function calculateGuestSignal(
  signals: GuestSignalInput[],
  now = new Date(),
): GuestSignalResult {
  const coolingMentionCount = signals.length;

  if (coolingMentionCount < 3) {
    return {
      status: "unverified",
      score: null,
      coolingMentionCount,
      brokenPenaltyApplied: false,
    };
  }

  let weightedPositive = 0;
  let weightedTotal = 0;

  for (const signal of signals) {
    const weight = SOURCE_WEIGHTS[signal.source] * recencyWeight(signal.extractedAt, now);
    weightedTotal += weight;

    if (signal.sentiment === "positive") {
      weightedPositive += weight;
    }
  }

  const bayesRatio =
    (weightedPositive + PRIOR_RATIO * PRIOR_STRENGTH) /
    (weightedTotal + PRIOR_STRENGTH);
  const sampleMultiplier = 0.7 + 0.3 * Math.min(1, coolingMentionCount / 12);
  const prePenalty = Math.round(100 * bayesRatio * sampleMultiplier);
  const brokenPenaltyApplied = hasTrailingBrokenMention(signals, now);
  const score = clamp(
    prePenalty - (brokenPenaltyApplied ? BROKEN_PENALTY : 0),
    0,
    100,
  );

  return {
    status: "scored",
    score,
    coolingMentionCount,
    brokenPenaltyApplied,
    weightedPositive,
    weightedTotal,
  };
}

export function recencyWeight(extractedAt: Date, now = new Date()) {
  const ageDays = Math.max(
    0,
    (now.getTime() - extractedAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (ageDays <= 180) return 1;
  if (ageDays <= 365) return 0.85;
  if (ageDays <= 730) return 0.6;
  return 0.35;
}

export function isBrokenAcMention(signal: GuestSignalInput) {
  if (signal.vote === "broken") return true;
  if (!signal.rawExcerpt) return false;
  return BROKEN_AC_PATTERNS.some((pattern) => pattern.test(signal.rawExcerpt ?? ""));
}

function hasTrailingBrokenMention(signals: GuestSignalInput[], now: Date) {
  return signals.some((signal) => {
    const ageDays =
      (now.getTime() - signal.extractedAt.getTime()) / (1000 * 60 * 60 * 24);
    return ageDays <= 365 && isBrokenAcMention(signal);
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
