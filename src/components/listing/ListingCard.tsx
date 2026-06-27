"use client";

import { ArrowRight, Building2, Home, MapPin, Snowflake } from "lucide-react";
import Link from "next/link";
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
  return (
    <article className={`listing-card ${selected ? "is-selected" : ""}`}>
      <button
        type="button"
        className="listing-select"
        aria-pressed={selected}
        onClick={onSelect}
      >
        <div className="listing-card-top">
          <TrustBadge tier={listing.trustTier} />
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
