import type { EditorScore } from "./trustTier";

const EDITOR_SCORE_REFERENCE: Record<EditorScore, number> = {
  verified_cold: 85,
  verified_adequate: 65,
  verified_weak: 40,
  verified_broken: 15,
};

export type SignalsConflictInput = {
  guestSignalScore: number | null;
  editorScore: EditorScore | null;
};

export function hasSignalsConflict({
  guestSignalScore,
  editorScore,
}: SignalsConflictInput) {
  if (guestSignalScore == null || editorScore == null) {
    return false;
  }

  return Math.abs(guestSignalScore - EDITOR_SCORE_REFERENCE[editorScore]) >= 35;
}

export function describeSignalsConflict(editorScore: EditorScore) {
  switch (editorScore) {
    case "verified_cold":
      return "An editor directly verified strong cooling. Compare that check with the less-positive guest evidence before booking.";
    case "verified_adequate":
      return "An editor directly found adequate cooling. Use that direct check as the safer guide for worst-case summer heat.";
    case "verified_weak":
      return "An editor directly found weak cooling. Use that direct check as the safer guide for worst-case summer heat.";
    case "verified_broken":
      return "An editor directly found broken cooling. Use that direct check as the safer guide for worst-case summer heat.";
  }
}
