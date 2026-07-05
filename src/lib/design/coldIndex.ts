import type { EditorScore } from "@/lib/scoring/trustTier";

/**
 * The Cold Index: one shared thermal scale applied to each score
 * independently (design.md §3.3).
 *
 * `coldIndex` and `coldIndexForEditorScore` are the ONLY places a score
 * becomes a color. Each takes exactly one score and never both, which is
 * the structural guard against blending Guest Signal and Editor Score
 * (constitution Laws I and VIII). Colors are returned as CSS custom
 * property references so light/dark themes resolve automatically.
 */

export type ColdBand = "glacier" | "cool" | "temperate" | "warm" | "hot";

export type ColdIndexResult = {
  band: ColdBand;
  solid: string;
  soft: string;
  label: string;
};

const BAND_LABELS: Record<ColdBand, string> = {
  glacier: "Freezing cold",
  cool: "Reliably cold",
  temperate: "Adequate",
  warm: "Runs warm",
  hot: "Weak / broken",
};

const EDITOR_SCORE_BANDS: Record<EditorScore, ColdBand> = {
  verified_cold: "glacier",
  verified_adequate: "temperate",
  verified_weak: "warm",
  verified_broken: "hot",
};

export function coldIndex(score: number): ColdIndexResult {
  return toResult(bandForScore(score));
}

export function coldIndexForEditorScore(
  editorScore: EditorScore,
): ColdIndexResult {
  return toResult(EDITOR_SCORE_BANDS[editorScore]);
}

function bandForScore(score: number): ColdBand {
  const clamped = Math.min(100, Math.max(0, score));

  if (clamped >= 85) return "glacier";
  if (clamped >= 70) return "cool";
  if (clamped >= 55) return "temperate";
  if (clamped >= 40) return "warm";
  return "hot";
}

function toResult(band: ColdBand): ColdIndexResult {
  return {
    band,
    solid: `var(--band-${band})`,
    soft: `var(--band-${band}-soft)`,
    label: BAND_LABELS[band],
  };
}
