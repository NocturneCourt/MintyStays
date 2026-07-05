import type { Listing } from "@/db/schema";
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
    sourceUrl: listing.sourceUrl ?? undefined,
    affiliateUrl: listing.affiliateUrl ?? undefined,
    acType: listing.acType ?? undefined,
    guestSignalScore: listing.guestSignalScore,
    guestSignalStatus: listing.guestSignalStatus,
    guestSignalConfidence: listing.guestSignalConfidence,
    editorScore: listing.editorScore,
    trustTier: listing.trustTier,
    evidenceSummary:
      listing.evidenceSummary ??
      "Cooling evidence exists for this listing, but no summary was provided.",
    reviewCountAnalyzed: listing.reviewCountAnalyzed,
  };
}
