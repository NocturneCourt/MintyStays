import type { Listing } from "@/db/schema";
import { hasSignalsConflict } from "@/lib/scoring/signalsConflict";
import type { PublicListing } from "./types";

export function mapDbListingToPublicListing(listing: Listing): PublicListing {
  return {
    id: listing.id,
    name: listing.name,
    type: listing.type,
    lat: listing.lat,
    lng: listing.lng,
    cityId: listing.cityId,
    address: listing.address ?? undefined,
    source: listing.source,
    sourceUrl: normalizeHttpUrl(listing.sourceUrl),
    affiliateUrl: normalizeHttpUrl(listing.affiliateUrl),
    imageUrl: normalizeHttpUrl(listing.imageUrl),
    imageAttribution: listing.imageAttribution ?? undefined,
    photoGallery: normalizePhotoGallery(listing.photoGallery),
    acType: listing.acType ?? undefined,
    guestSignalScore: listing.guestSignalScore,
    guestSignalStatus: listing.guestSignalStatus,
    guestSignalConfidence: listing.guestSignalConfidence,
    editorScore: listing.editorScore,
    signalsConflict: hasSignalsConflict({
      guestSignalScore: listing.guestSignalScore,
      editorScore: listing.editorScore,
    }),
    trustTier: listing.trustTier,
    evidenceSummary:
      listing.evidenceSummary ??
      "Cooling evidence exists for this listing, but no summary was provided.",
    reviewCountAnalyzed: listing.reviewCountAnalyzed,
  };
}

function normalizeHttpUrl(value: string | null | undefined) {
  if (!value) return undefined;

  try {
    const candidate = value.trim();
    const protocol = new URL(candidate).protocol;
    return protocol === "http:" || protocol === "https:" ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function normalizePhotoGallery(value: unknown): PublicListing["photoGallery"] {
  if (!Array.isArray(value)) return undefined;

  const gallery = value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];

    const record = item as Record<string, unknown>;
    const url = normalizeHttpUrl(
      typeof record.url === "string" ? record.url : undefined,
    );

    if (!url) return [];

    const attribution =
      typeof record.attribution === "string" ? record.attribution.trim() : undefined;

    return [
      {
        url,
        ...(attribution ? { attribution: attribution.slice(0, 240) } : {}),
      },
    ];
  });

  return gallery.length ? gallery.slice(0, 12) : undefined;
}
