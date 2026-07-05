import type { SeedListing } from "./ListingSourceAdapter";

export type SeedValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
  listingName?: string;
};

export type SeedValidationResult = {
  ok: boolean;
  listingCount: number;
  reviewExcerptCount: number;
  evidenceBackedListingCount: number;
  editorialListingCount: number;
  errors: SeedValidationIssue[];
  warnings: SeedValidationIssue[];
  issues: SeedValidationIssue[];
};

export type SeedValidationOptions = {
  strict?: boolean;
};

export function validateSeedListings(
  listings: SeedListing[],
  options: SeedValidationOptions = {},
): SeedValidationResult {
  const issues: SeedValidationIssue[] = [];
  const strict = options.strict ?? false;

  const addError = (issue: Omit<SeedValidationIssue, "severity">) => {
    issues.push({ ...issue, severity: "error" });
  };
  const addWarning = (issue: Omit<SeedValidationIssue, "severity">) => {
    issues.push({ ...issue, severity: strict ? "error" : "warning" });
  };

  if (!listings.length) {
    addError({
      code: "seed.empty",
      message: "Seed file must contain at least one listing.",
    });
  }

  const firstCity = listings[0]?.city;
  if (!firstCity) {
    addError({
      code: "city.missing_metadata",
      message: "Seed data must include city metadata on the first listing.",
    });
  } else {
    validateCoordinate(firstCity.lat, "city.latitude", firstCity.name, addError);
    validateCoordinate(firstCity.lng, "city.longitude", firstCity.name, addError);
  }

  const expectedCitySlug = listings[0]?.citySlug;
  const seenListingNames = new Set<string>();

  for (const listing of listings) {
    const listingName = listing.name;
    const reviewExcerpts = listing.reviewExcerpts ?? [];
    const hasEvidenceSummary = Boolean(listing.evidenceSummary?.trim());
    const hasReviewEvidence = reviewExcerpts.length > 0;
    const hasEditorialStatus = Boolean(
      listing.editorial?.handpicked ||
        listing.editorial?.editorVerified ||
        listing.editorial?.editorScore,
    );

    if (expectedCitySlug && listing.citySlug !== expectedCitySlug) {
      addError({
        code: "city.slug_mismatch",
        listingName,
        message: `Listing city slug ${listing.citySlug} does not match ${expectedCitySlug}.`,
      });
    }

    if (seenListingNames.has(listingName.toLowerCase())) {
      addWarning({
        code: "listing.duplicate_name",
        listingName,
        message: "Seed contains another listing with the same name.",
      });
    }
    seenListingNames.add(listingName.toLowerCase());

    validateCoordinate(listing.lat, "listing.latitude", listingName, addError);
    validateCoordinate(listing.lng, "listing.longitude", listingName, addError);
    validateSourceUrls(listing, addWarning);

    if (!listing.affiliateBaseUrl) {
      addWarning({
        code: "listing.missing_affiliate_url",
        listingName,
        message: "Listing is missing affiliateBaseUrl for day-one click tracking.",
      });
    }

    if (!hasEvidenceSummary && hasReviewEvidence) {
      addWarning({
        code: "listing.missing_evidence_summary",
        listingName,
        message: "Listing has review excerpts but no paraphrased evidence summary.",
      });
    }

    if (hasReviewEvidence || hasEvidenceSummary || listing.evidenceSource) {
      validateResearchEvidence(listing, addError, addWarning);
    }

    if (!hasEvidenceSummary && !hasReviewEvidence && !hasEditorialStatus) {
      addError({
        code: "listing.empty_pin",
        listingName,
        message:
          "Listing needs cooling evidence or editorial status before it can appear publicly.",
      });
    }

    if (listing.editorial?.editorVerified && !listing.editorial.editorScore) {
      addError({
        code: "editorial.verified_without_score",
        listingName,
        message: "Editor Verified listings must include an Editor Score.",
      });
    }

    if (listing.editorial?.editorScore && !listing.editorial.editorVerified) {
      addError({
        code: "editorial.score_without_verification",
        listingName,
        message: "Editor Score requires editorVerified=true.",
      });
    }
  }

  const errors = issues.filter((issue) => issue.severity === "error");
  const warnings = issues.filter((issue) => issue.severity === "warning");

  return {
    ok: errors.length === 0,
    listingCount: listings.length,
    reviewExcerptCount: listings.reduce(
      (total, listing) => total + (listing.reviewExcerpts?.length ?? 0),
      0,
    ),
    evidenceBackedListingCount: listings.filter(
      (listing) => listing.evidenceSummary?.trim() || listing.reviewExcerpts?.length,
    ).length,
    editorialListingCount: listings.filter(
      (listing) =>
        listing.editorial?.handpicked ||
        listing.editorial?.editorVerified ||
        listing.editorial?.editorScore,
    ).length,
    errors,
    warnings,
    issues,
  };
}

function validateCoordinate(
  value: number,
  code: string,
  listingName: string,
  addError: (issue: Omit<SeedValidationIssue, "severity">) => void,
) {
  const isLatitude = code.endsWith("latitude");
  const min = isLatitude ? -90 : -180;
  const max = isLatitude ? 90 : 180;

  if (!Number.isFinite(value) || value < min || value > max) {
    addError({
      code,
      listingName,
      message: `${isLatitude ? "Latitude" : "Longitude"} must be between ${min} and ${max}.`,
    });
  }
}

function validateSourceUrls(
  listing: SeedListing,
  addWarning: (issue: Omit<SeedValidationIssue, "severity">) => void,
) {
  const urls = [
    listing.sourceUrl,
    listing.affiliateBaseUrl,
    listing.evidenceSource?.url,
  ].filter((url): url is string => Boolean(url));

  if (urls.some(isPlaceholderUrl)) {
    addWarning({
      code: "listing.placeholder_url",
      listingName: listing.name,
      message: "Seed listing uses a placeholder URL instead of an auditable source.",
    });
  }
}

function validateResearchEvidence(
  listing: SeedListing,
  addError: (issue: Omit<SeedValidationIssue, "severity">) => void,
  addWarning: (issue: Omit<SeedValidationIssue, "severity">) => void,
) {
  const listingName = listing.name;
  const source = listing.evidenceSource;

  if (source?.paraphrased === false) {
    addError({
      code: "evidence.not_paraphrased",
      listingName,
      message:
        "Manual research evidence must be paraphrased before it enters seed data.",
    });
  } else if (!source?.paraphrased) {
    addWarning({
      code: "evidence.paraphrase_unconfirmed",
      listingName,
      message:
        "Set evidence_is_paraphrased=true after converting review text into cooling themes.",
    });
  }

  if (!source?.url && !listing.sourceUrl) {
    addWarning({
      code: "evidence.missing_source_url",
      listingName,
      message: "Cooling evidence should include a source URL for later audit.",
    });
  }

  if (!source?.observedAt) {
    addWarning({
      code: "evidence.missing_observed_at",
      listingName,
      message: "Cooling evidence should include the date it was observed.",
    });
  }

  for (const excerpt of listing.reviewExcerpts ?? []) {
    if (!excerpt.authoredAt) {
      addWarning({
        code: "evidence.missing_authored_at",
        listingName,
        message:
          "Cooling signal is missing authoredAt, so recency and seasonality cannot be computed.",
      });
    }

    if (looksLikeCopiedReviewText(excerpt.text)) {
      addWarning({
        code: "evidence.possible_raw_copy",
        listingName,
        message:
          "Cooling signal looks like copied review text; convert it to a short paraphrased theme.",
      });
    }
  }
}

function looksLikeCopiedReviewText(value: string) {
  const trimmed = value.trim();
  return (
    trimmed.length > 260 ||
    /^["'“”‘’]/.test(trimmed) ||
    /["“”]$/.test(trimmed) ||
    /\bI\b.*\b(my|our|we|stayed|room)\b/i.test(trimmed)
  );
}

function isPlaceholderUrl(value: string) {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname === "example.com" || hostname === "www.example.com";
  } catch {
    return false;
  }
}
