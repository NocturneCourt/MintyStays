import rawSeed from "@/db/seed/minty-launch-city.json";
import { calculateGuestSignal } from "@/lib/scoring/guestSignalFormula";
import { inferCoolingSentiment } from "@/lib/scoring/inferCoolingSentiment";
import { deriveTrustTier } from "@/lib/scoring/trustTier";
import { seedFileSchema } from "@/lib/sources/ListingSourceAdapter";
import type { PublicCity, PublicListing } from "./types";

const seed = seedFileSchema.parse(rawSeed);

export function getSeedCity(): PublicCity {
  return {
    id: seed.city.slug,
    name: seed.city.name,
    country: seed.city.country,
    slug: seed.city.slug,
    lat: seed.city.lat,
    lng: seed.city.lng,
    isActive: seed.city.isActive ?? true,
  };
}

export function getSeedListings(): PublicListing[] {
  const city = getSeedCity();

  return seed.listings.map((listing, index) => {
    const guestSignal = calculateGuestSignal(
      listing.reviewExcerpts.map((excerpt) => ({
        source: "scraped",
        sentiment: inferCoolingSentiment(excerpt.text),
        rawExcerpt: excerpt.text,
        authoredAt: parseSeedDate(excerpt.authoredAt),
      })),
      new Date("2026-06-26T12:00:00Z"),
      { cityLat: city.lat },
    );
    const editorVerifiedAt = listing.editorial?.editorVerified
      ? new Date("2026-06-20T12:00:00Z")
      : null;
    const trustTier = deriveTrustTier({
      guestSignalStatus: guestSignal.status,
      isHandpicked: listing.editorial?.handpicked,
      editorScore: listing.editorial?.editorScore ?? null,
      editorVerifiedAt,
    });

    return {
      id: slugify(`${listing.name}-${index + 1}`),
      name: listing.name,
      type: listing.type,
      lat: listing.lat,
      lng: listing.lng,
      cityId: city.id,
      address: listing.address,
      source: listing.source,
      sourceUrl: listing.sourceUrl,
      affiliateUrl: listing.affiliateBaseUrl,
      acType: listing.acType,
      guestSignalScore: guestSignal.score,
      guestSignalStatus: guestSignal.status,
      guestSignalConfidence: guestSignal.confidence,
      editorScore: listing.editorial?.editorScore ?? null,
      trustTier,
      evidenceSummary:
        listing.evidenceSummary ??
        "Cooling evidence exists for this seed listing, but no summary was provided.",
      reviewCountAnalyzed: listing.reviewExcerpts.length,
    };
  });
}

function parseSeedDate(value?: string) {
  return value ? new Date(`${value}T12:00:00Z`) : null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
