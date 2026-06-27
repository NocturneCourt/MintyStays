import type { CoolingSentiment } from "./guestSignalFormula";

const NEGATIVE_PATTERNS = [
  /\b(ac|a\/c|air conditioning)\b.{0,40}\b(broken|weak|too warm|too hot)\b/i,
  /\b(broken|weak|too warm|too hot)\b.{0,40}\b(ac|a\/c|air conditioning)\b/i,
  /\b(ac|a\/c|air conditioning)\b.{0,40}\b(did not work|didn't work|does not work|doesn't work)\b/i,
  /\b(room|suite|bedroom|space)\b.{0,24}\b(too hot|too warm|stayed hot|stayed warm)\b/i,
];

const POSITIVE_PATTERNS = [
  /\b(cold|cooled|cooling|cool|powerful|excellent|icy|strong)\b/i,
  /\b(ac|a\/c|air conditioning)\b.{0,40}\b(worked well|effective|great)\b/i,
];

export function inferCoolingSentiment(excerpt: string): CoolingSentiment {
  if (NEGATIVE_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "negative";
  }

  if (POSITIVE_PATTERNS.some((pattern) => pattern.test(excerpt))) {
    return "positive";
  }

  return "neutral";
}
