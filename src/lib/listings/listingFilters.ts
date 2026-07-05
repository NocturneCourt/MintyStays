import type { ListingType } from "./types";

export type ListingFilters = {
  minScore?: number;
  type?: ListingType;
  trustTier?: "unverified" | "scored" | "handpicked" | "editor_verified";
  bounds?: ListingBounds;
};

export type ListingBounds = {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
};

export function parseListingFilters(
  params: Record<string, string | string[] | undefined>,
): ListingFilters {
  const score = first(params.score);
  const type = first(params.type);
  const trustTier = first(params.trustTier);
  const bounds = parseBounds(params);

  return {
    minScore: score ? clamp(Number(score), 0, 100) : undefined,
    type: type === "hotel" || type === "str" ? type : undefined,
    trustTier: isTrustTier(trustTier) ? trustTier : undefined,
    bounds,
  };
}

export function buildFilterQuery(filters: ListingFilters) {
  const query = new URLSearchParams();

  if (filters.minScore != null) query.set("score", String(filters.minScore));
  if (filters.type) query.set("type", filters.type);
  if (filters.trustTier) query.set("trustTier", filters.trustTier);
  if (filters.bounds) {
    query.set("minLat", String(filters.bounds.minLat));
    query.set("maxLat", String(filters.bounds.maxLat));
    query.set("minLng", String(filters.bounds.minLng));
    query.set("maxLng", String(filters.bounds.maxLng));
  }

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

function parseBounds(
  params: Record<string, string | string[] | undefined>,
): ListingBounds | undefined {
  const minLat = parseNumber(first(params.minLat));
  const maxLat = parseNumber(first(params.maxLat));
  const minLng = parseNumber(first(params.minLng));
  const maxLng = parseNumber(first(params.maxLng));

  if (
    minLat == null ||
    maxLat == null ||
    minLng == null ||
    maxLng == null ||
    minLat < -90 ||
    maxLat > 90 ||
    minLng < -180 ||
    maxLng > 180 ||
    minLat >= maxLat ||
    minLng >= maxLng
  ) {
    return undefined;
  }

  return { minLat, maxLat, minLng, maxLng };
}

function parseNumber(value?: string) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
