import rawSeed from "@/db/seed/minty-launch-city.json";
import { calculateGuestSignal } from "@/lib/scoring/guestSignalFormula";
import {
  inferCoolingSentiment,
  mentionsCoolingVocabulary,
} from "@/lib/scoring/inferCoolingSentiment";
import { hasSignalsConflict } from "@/lib/scoring/signalsConflict";
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

  return seed.listings.filter(isPublicSeedListing).map((listing, index) => {
    const coolingExcerpts = listing.reviewExcerpts.filter((excerpt) =>
      mentionsCoolingVocabulary(excerpt.text),
    );
    const guestSignal = calculateGuestSignal(
      coolingExcerpts.map((excerpt) => ({
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
      imageUrl: listing.imageUrl,
      imageAttribution: listing.imageAttribution,
      photoGallery: listing.photoGallery,
      acType: listing.acType,
      guestSignalScore: guestSignal.score,
      guestSignalStatus: guestSignal.status,
      guestSignalConfidence: guestSignal.confidence,
      editorScore: listing.editorial?.editorScore ?? null,
      signalsConflict: hasSignalsConflict({
        guestSignalScore: guestSignal.score,
        editorScore: listing.editorial?.editorScore ?? null,
      }),
      trustTier,
      evidenceSummary:
        listing.evidenceSummary ??
        "Cooling evidence exists for this seed listing, but no summary was provided.",
      reviewCountAnalyzed: coolingExcerpts.length,
    };
  });
}

function isPublicSeedListing(listing: (typeof seed.listings)[number]) {
  return Boolean(
    listing.evidenceSummary?.trim() ||
    listing.reviewExcerpts.some((excerpt) =>
      mentionsCoolingVocabulary(excerpt.text),
    ) ||
    listing.editorial?.handpicked ||
    (listing.editorial?.editorVerified && listing.editorial.editorScore),
  );
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
