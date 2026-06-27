export type TrustTier = "unverified" | "scored" | "handpicked" | "editor_verified";
export type GuestSignalStatus = "unverified" | "scored";
export type EditorScore =
  | "verified_cold"
  | "verified_adequate"
  | "verified_weak"
  | "verified_broken";

export type TrustTierInput = {
  guestSignalStatus: GuestSignalStatus;
  isHandpicked?: boolean | null;
  editorScore?: EditorScore | null;
  editorVerifiedAt?: Date | string | null;
};

export function deriveTrustTier(input: TrustTierInput): TrustTier {
  if (input.editorScore && input.editorVerifiedAt) {
    return "editor_verified";
  }

  if (input.isHandpicked) {
    return "handpicked";
  }

  if (input.guestSignalStatus === "scored") {
    return "scored";
  }

  return "unverified";
}

export function describeTrustTier(tier: TrustTier) {
  switch (tier) {
    case "editor_verified":
      return "Trusted human confirmation of cooling performance.";
    case "handpicked":
      return "Editorially selected as a strong candidate, not direct verification.";
    case "scored":
      return "Enough guest cooling mentions exist to compute Guest Signal.";
    case "unverified":
      return "Fewer than three cooling mentions, so no Guest Signal number.";
  }
}
