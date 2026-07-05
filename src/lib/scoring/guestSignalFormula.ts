export type ReviewSignalSource = "scraped" | "anonymous" | "insider";
export type CoolingSentiment = "positive" | "negative" | "neutral";
export type GuestSignalConfidence = "high" | "moderate" | "low";

export type GuestSignalInput = {
  source: ReviewSignalSource;
  sentiment: CoolingSentiment;
  authoredAt?: Date | null;
  rawExcerpt?: string | null;
  vote?: "confirm_cold" | "dispute_weak" | "broken";
};

export type GuestSignalOptions = {
  cityLat?: number;
};

export type GuestSignalResult =
  | {
      status: "unverified";
      score: null;
      coolingMentionCount: number;
      brokenPenaltyApplied: false;
      confidence: null;
      effectiveSampleSize: number;
    }
  | {
      status: "scored";
      score: number;
      coolingMentionCount: number;
      brokenPenaltyApplied: boolean;
      confidence: GuestSignalConfidence;
      confidenceBandWidth: number;
      effectiveSampleSize: number;
      weightedPositive: number;
      weightedTotal: number;
      brokenPenalty: number;
    };

const PRIOR_RATIO = 0.55;
const PRIOR_STRENGTH = 8;
const RECENCY_HALF_LIFE_DAYS = 540;
const CONFIDENCE_Z = 1;
const MIN_EFFECTIVE_SAMPLE_SIZE = 1;

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
  options: GuestSignalOptions = {},
): GuestSignalResult {
  const coolingMentionCount = signals.length;

  if (coolingMentionCount < 3) {
    return {
      status: "unverified",
      score: null,
      coolingMentionCount,
      brokenPenaltyApplied: false,
      confidence: null,
      effectiveSampleSize: 0,
    };
  }

  let weightedPositive = 0;
  let weightedTotal = 0;

  for (const signal of signals) {
    const weight = signalWeight(signal, now, options.cityLat);
    weightedTotal += weight;

    if (signal.sentiment === "positive") {
      weightedPositive += weight;
    }
  }

  if (weightedTotal < MIN_EFFECTIVE_SAMPLE_SIZE) {
    return {
      status: "unverified",
      score: null,
      coolingMentionCount,
      brokenPenaltyApplied: false,
      confidence: null,
      effectiveSampleSize: round(weightedTotal, 2),
    };
  }

  const pHat =
    (weightedPositive + PRIOR_RATIO * PRIOR_STRENGTH) /
    (weightedTotal + PRIOR_STRENGTH);
  const confidenceBandWidth = calculateConfidenceBandWidth(pHat, weightedTotal);
  const brokenPenalty = calculateBrokenPenalty(signals, now, options.cityLat);
  const brokenPenaltyApplied = brokenPenalty > 0;
  const score = clamp(Math.round(100 * pHat) - brokenPenalty, 0, 100);

  return {
    status: "scored",
    score,
    coolingMentionCount,
    brokenPenaltyApplied,
    confidence: classifyConfidence(confidenceBandWidth),
    confidenceBandWidth,
    effectiveSampleSize: round(weightedTotal, 2),
    weightedPositive,
    weightedTotal,
    brokenPenalty,
  };
}

export function recencyWeight(authoredAt: Date, now = new Date()) {
  const ageDays = Math.max(
    0,
    (now.getTime() - authoredAt.getTime()) / (1000 * 60 * 60 * 24),
  );

  return 0.5 ** (ageDays / RECENCY_HALF_LIFE_DAYS);
}

export function seasonalityWeight(authoredAt: Date, cityLat = 0) {
  const northernMonth = authoredAt.getUTCMonth() + 1;
  const month =
    cityLat < 0 ? ((northernMonth - 1 + 6) % 12) + 1 : northernMonth;

  if (month >= 6 && month <= 9) return 1;
  if (month === 5 || month === 10) return 0.7;
  if (month === 4 || month === 11) return 0.4;
  return 0.2;
}

export function isBrokenAcMention(signal: GuestSignalInput) {
  if (signal.vote === "broken") return true;
  if (!signal.rawExcerpt) return false;
  return BROKEN_AC_PATTERNS.some((pattern) => pattern.test(signal.rawExcerpt ?? ""));
}

function signalWeight(signal: GuestSignalInput, now: Date, cityLat = 0) {
  if (!signal.authoredAt) {
    return 0;
  }

  return (
    SOURCE_WEIGHTS[signal.source] *
    recencyWeight(signal.authoredAt, now) *
    seasonalityWeight(signal.authoredAt, cityLat)
  );
}

function calculateBrokenPenalty(
  signals: GuestSignalInput[],
  now: Date,
  cityLat = 0,
) {
  const brokenWeight = signals.reduce((total, signal) => {
    if (!signal.authoredAt || !isBrokenAcMention(signal)) {
      return total;
    }

    const ageDays =
      (now.getTime() - signal.authoredAt.getTime()) / (1000 * 60 * 60 * 24);

    if (ageDays > 365) {
      return total;
    }

    return total + signalWeight(signal, now, cityLat);
  }, 0);

  return Math.round(Math.min(40, 10 * brokenWeight));
}

function calculateConfidenceBandWidth(pHat: number, effectiveSampleSize: number) {
  const denominator = 1 + CONFIDENCE_Z ** 2 / effectiveSampleSize;
  const half =
    (CONFIDENCE_Z / denominator) *
    Math.sqrt(
      (pHat * (1 - pHat)) / effectiveSampleSize +
        CONFIDENCE_Z ** 2 / (4 * effectiveSampleSize ** 2),
    );

  return Math.round(100 * 2 * half);
}

function classifyConfidence(bandWidth: number): GuestSignalConfidence {
  if (bandWidth <= 12) return "high";
  if (bandWidth <= 25) return "moderate";
  return "low";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
