"use client";

import { useState, type CSSProperties } from "react";
import { Snowflake } from "lucide-react";
import { coldIndex, coldIndexForEditorScore } from "@/lib/design/coldIndex";
import type { PublicListing } from "@/lib/listings/types";

export function ListingImage({
  listing,
  variant = "card",
  imageUrl,
  attribution,
  priority = false,
}: {
  listing: PublicListing;
  variant?: "card" | "hero" | "gallery";
  imageUrl?: string;
  attribution?: string;
  priority?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const resolvedUrl = safeImageUrl(imageUrl ?? listing.imageUrl);
  const resolvedAttribution = attribution ?? listing.imageAttribution;
  const index = getImageIndex(listing);
  const style = {
    "--image-color": index?.solid ?? "var(--line-strong)",
    "--image-soft": index?.soft ?? "var(--panel-2)",
  } as CSSProperties;

  if (resolvedUrl && failedUrl !== resolvedUrl) {
    return (
      <div className={`listing-image listing-image-${variant}`} style={style}>
        {/* A remote image is optional, so a failed source can fall back in place. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedUrl}
          alt={`${listing.name} accommodation`}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          referrerPolicy="no-referrer"
          onError={() => setFailedUrl(resolvedUrl)}
        />
        {resolvedAttribution ? (
          <small className="listing-image-attribution">
            Photo: {resolvedAttribution}
          </small>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={`listing-image listing-image-${variant} listing-image-placeholder`}
      style={style}
      role="img"
      aria-label={`${listing.name} thermal placeholder; no licensed photo available`}
    >
      <Snowflake
        className="listing-image-mark"
        size={variant === "hero" ? 42 : 28}
        aria-hidden="true"
      />
      <span>Thermal placeholder</span>
      <small>{listing.name}</small>
    </div>
  );
}

function safeImageUrl(value?: string) {
  if (!value) return undefined;

  try {
    const candidate = value.trim();
    const protocol = new URL(candidate).protocol;
    return protocol === "http:" || protocol === "https:" ? candidate : undefined;
  } catch {
    return undefined;
  }
}

function getImageIndex(listing: PublicListing) {
  if (listing.guestSignalScore != null) {
    return coldIndex(listing.guestSignalScore);
  }

  return listing.editorScore ? coldIndexForEditorScore(listing.editorScore) : null;
}
