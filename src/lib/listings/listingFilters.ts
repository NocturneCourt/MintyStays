import type { ListingType } from "./types";

export type ListingFilters = {
  minScore?: number;
  type?: ListingType;
  trustTier?: "unverified" | "scored" | "handpicked" | "editor_verified";
};

export function parseListingFilters(
  params: Record<string, string | string[] | undefined>,
): ListingFilters {
  const score = first(params.score);
  const type = first(params.type);
  const trustTier = first(params.trustTier);

  return {
    minScore: score ? clamp(Number(score), 0, 100) : undefined,
    type: type === "hotel" || type === "str" ? type : undefined,
    trustTier: isTrustTier(trustTier) ? trustTier : undefined,
  };
}

export function buildFilterQuery(filters: ListingFilters) {
  const query = new URLSearchParams();

  if (filters.minScore != null) query.set("score", String(filters.minScore));
  if (filters.type) query.set("type", filters.type);
  if (filters.trustTier) query.set("trustTier", filters.trustTier);

  return query.toString();
}

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return undefined;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function isTrustTier(value?: string): value is ListingFilters["trustTier"] {
  return (
    value === "unverified" ||
    value === "scored" ||
    value === "handpicked" ||
    value === "editor_verified"
  );
}
