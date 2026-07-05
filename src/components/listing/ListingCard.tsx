"use client";

import type { CSSProperties } from "react";
import { ArrowRight, Building2, Home, MapPin, Snowflake } from "lucide-react";
import Link from "next/link";
import { coldIndex } from "@/lib/design/coldIndex";
import type { PublicListing } from "@/lib/listings/types";
import { ScoreRows } from "./ScoreRows";
import { TrustBadge } from "./TrustBadge";

export function ListingCard({
  listing,
  selected,
  onSelect,
}: {
  listing: PublicListing;
  selected: boolean;
  onSelect: () => void;
}) {
  const cardStyle = getCardStyle(listing);

  return (
    <article
      className={`listing-card ${selected ? "is-selected" : ""}`}
      style={cardStyle}
    >
      <button
        type="button"
        className="listing-select"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <div className="listing-visual">
          <span className="cold-chip">
            {listing.guestSignalScore != null
              ? `${listing.guestSignalScore} Guest Signal`
              : "Unverified"}
          </span>
          <TrustBadge tier={listing.trustTier} />
        </div>
        <div className="listing-card-top">
          <span className="listing-type-pill">
            {listing.type === "hotel" ? (
              <Building2 size={14} aria-hidden="true" />
            ) : (
              <Home size={14} aria-hidden="true" />
            )}
            {listing.type === "hotel" ? "Hotel" : "Rental"}
          </span>
        </div>
        <div className="listing-title-block">
          <h2>{listing.name}</h2>
          <p className="listing-meta">
            <MapPin size={13} aria-hidden="true" />
            {listing.address ?? "Launch city"}
            {listing.acType ? (
              <>
                <span aria-hidden="true">/</span>
                <Snowflake size={13} aria-hidden="true" />
                {formatAcType(listing.acType)} AC
              </>
            ) : null}
          </p>
        </div>
        <ScoreRows listing={listing} />
        <p className="evidence">{listing.evidenceSummary}</p>
      </button>
      <Link className="detail-link" href={`/listings/${listing.id}`}>
        View detail
        <ArrowRight size={15} aria-hidden="true" />
      </Link>
    </article>
  );
}

function getCardStyle(listing: PublicListing): CSSProperties {
  if (listing.guestSignalScore == null) return {};
  const index = coldIndex(listing.guestSignalScore);

  return {
    "--band-color": index.solid,
    "--band-soft": index.soft,
  } as CSSProperties;
}

function formatAcType(acType: NonNullable<PublicListing["acType"]>) {
  switch (acType) {
    case "split":
      return "Split";
    case "central":
      return "Central";
    case "portable":
      return "Portable";
    case "none":
      return "None";
  }
}
