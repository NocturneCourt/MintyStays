import type { NewListing, NewUserContribution } from "./schema";

export function validateListingInvariant(listing: Pick<
  NewListing,
  | "guestSignalScore"
  | "guestSignalStatus"
  | "guestSignalConfidence"
  | "editorScore"
  | "editorVerifiedAt"
  | "evidenceSummary"
  | "isHandpicked"
>) {
  if (listing.guestSignalStatus === "unverified" && listing.guestSignalScore != null) {
    throw new Error("Unverified listings must not have a Guest Signal number");
  }

  if (listing.guestSignalStatus === "unverified" && listing.guestSignalConfidence) {
    throw new Error("Unverified listings must not have a Guest Signal confidence");
  }

  if (listing.guestSignalStatus === "scored") {
    if (listing.guestSignalScore == null) {
      throw new Error("Scored listings require a Guest Signal number");
    }

    if (!listing.guestSignalConfidence) {
      throw new Error("Scored listings require a Guest Signal confidence");
    }

    if (listing.guestSignalScore < 0 || listing.guestSignalScore > 100) {
      throw new Error("Guest Signal must be between 0 and 100");
    }
  }

  if (listing.editorVerifiedAt && !listing.editorScore) {
    throw new Error("Editor Verified listings require an Editor Score");
  }

  const hasEvidence = Boolean(listing.evidenceSummary?.trim());
  const hasEditorialStatus = Boolean(listing.isHandpicked || listing.editorVerifiedAt);

  if (!hasEvidence && !hasEditorialStatus) {
    throw new Error("Public listings require cooling evidence or editorial status");
  }
}

export function validateContributionInvariant(
  contribution: Pick<NewUserContribution, "contributorType" | "sessionId" | "userId">,
) {
  if (contribution.contributorType === "anonymous" && !contribution.sessionId) {
    throw new Error("Anonymous contributions require a session id");
  }

  if (contribution.contributorType === "insider" && !contribution.userId) {
    throw new Error("Insider contributions require a user id");
  }
}
