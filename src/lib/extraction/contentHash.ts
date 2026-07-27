import { createHash } from "node:crypto";

export function hashReviewContent(text: string) {
  return createHash("sha256").update(normalizeReviewContent(text)).digest("hex");
}

export function normalizeReviewContent(text: string) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}
