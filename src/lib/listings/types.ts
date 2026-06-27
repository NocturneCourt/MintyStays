import type { EditorScore, TrustTier } from "@/lib/scoring/trustTier";

export type ListingType = "hotel" | "str";
export type AcType = "split" | "central" | "portable" | "none";

export type PublicCity = {
  id: string;
  name: string;
  country: string;
  slug: string;
  lat: number;
  lng: number;
  isActive: boolean;
};

export type PublicListing = {
  id: string;
  name: string;
  type: ListingType;
  lat: number;
  lng: number;
  cityId: string;
  address?: string;
  source: string;
  sourceUrl?: string;
  affiliateUrl?: string;
  acType?: AcType;
  guestSignalScore: number | null;
  guestSignalStatus: "unverified" | "scored";
  editorScore: EditorScore | null;
  trustTier: TrustTier;
  evidenceSummary: string;
  reviewCountAnalyzed: number;
};
