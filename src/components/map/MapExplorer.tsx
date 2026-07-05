"use client";

import type { CSSProperties } from "react";
import { useCallback, useState } from "react";
import { Building2, Home, MapPin, Snowflake } from "lucide-react";
import { coldIndex } from "@/lib/design/coldIndex";
import type { ListingFilters } from "@/lib/listings/listingFilters";
import type { PublicCity, PublicListing } from "@/lib/listings/types";
import { ListingList } from "@/components/listing/ListingList";
import { MapFilters } from "@/components/map/MapFilters";
import { ScoreRows } from "@/components/listing/ScoreRows";
import { TrustBadge } from "@/components/listing/TrustBadge";
import { ListingMap } from "./ListingMap";

export function MapExplorer({
  city,
  listings,
  filters,
  styleUrl,
}: {
  city: PublicCity;
  listings: PublicListing[];
  filters: ListingFilters;
  styleUrl: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    listings[0]?.id ?? null,
  );
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const selectedListing =
    listings.find((listing) => listing.id === selectedId) ?? listings[0] ?? null;
  const scoredCount = listings.filter(
    (listing) => listing.guestSignalStatus === "scored",
  ).length;
  const editorVerifiedCount = listings.filter(
    (listing) => listing.trustTier === "editor_verified",
  ).length;
  const scoredListings = listings.filter(
    (listing) => listing.guestSignalScore != null,
  );
  const topGuestSignal = scoredListings.length
    ? Math.max(
        ...scoredListings.map((listing) => listing.guestSignalScore ?? 0),
      )
    : null;
  const selectedStyle = selectedListing
    ? getBandStyle(selectedListing)
    : undefined;

  return (
    <div className="explorer">
      <section className="map-pane" aria-label={`${city.name} cold-stay map`}>
        <div className="map-console" aria-live="polite">
          <span className="eyebrow">Launch city</span>
          <strong>{city.name}</strong>
          <span>
            {selectedListing
              ? `${selectedListing.name} selected`
              : "No listing selected"}
          </span>
        </div>
        <div className="map-tool-stack" aria-label="Map tools">
          <span>Cooling layer</span>
          <strong>Cold Index</strong>
        </div>
        {listings.length ? (
          <ListingMap
            city={city}
            listings={listings}
            selectedId={selectedId}
            onSelect={handleSelect}
            styleUrl={styleUrl}
          />
        ) : (
          <div className="map-empty">
            No cold-stay matches are available for these filters.
          </div>
        )}
        <div className="map-scale" aria-hidden="true">
          <div>
            <strong>Cold Index</strong>
            <span>Lower is warmer</span>
          </div>
          <span className="thermal-ramp" />
          <div>
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
        </div>
        <div className="map-insight-strip" aria-label="Visible cooling summary">
          <span>
            <strong>{city.name}</strong>
            Launch city
          </span>
          <span>
            <strong>{topGuestSignal ?? "..."}</strong>
            Top Guest Signal
          </span>
          <span>
            <strong>{editorVerifiedCount}</strong>
            Editor verified
          </span>
        </div>
      </section>
      <aside className="list-pane intelligence-pane">
        {selectedListing ? (
          <section
            className="selected-dossier"
            aria-label="Selected stay intelligence"
            style={selectedStyle}
          >
            <div className="dossier-visual" aria-hidden="true">
              <span>
                {selectedListing.guestSignalScore != null
                  ? selectedListing.guestSignalScore
                  : "Cold"}
              </span>
            </div>
            <div className="dossier-copy">
              <div className="listing-card-top">
                <TrustBadge tier={selectedListing.trustTier} />
                <span className="listing-type-pill">
                  {selectedListing.type === "hotel" ? (
                    <Building2 size={14} aria-hidden="true" />
                  ) : (
                    <Home size={14} aria-hidden="true" />
                  )}
                  {selectedListing.type === "hotel" ? "Hotel" : "Rental"}
                </span>
              </div>
              <p className="dossier-title">{selectedListing.name}</p>
              <p className="listing-meta">
                <MapPin size={13} aria-hidden="true" />
                {selectedListing.address ?? city.name}
                {selectedListing.acType ? (
                  <>
                    <span aria-hidden="true">/</span>
                    <Snowflake size={13} aria-hidden="true" />
                    {formatAcType(selectedListing.acType)} AC
                  </>
                ) : null}
              </p>
              <ScoreRows listing={selectedListing} />
            </div>
          </section>
        ) : null}
        <section className="filter-dock" aria-label="Cold-stay filters">
          <div>
            <span className="eyebrow">Filters</span>
            <strong>Find the coldest fit</strong>
          </div>
          <MapFilters filters={filters} />
        </section>
        <div className="list-heading">
          <div>
            <span className="eyebrow">Ranked stays</span>
            <h1>{city.name}</h1>
          </div>
          <span>{listings.length} signals</span>
        </div>
        <div className="list-stats" aria-label="Visible listing summary">
          <span>
            <strong>{scoredCount}</strong>
            Guest scored
          </span>
          <span>
            <strong>{editorVerifiedCount}</strong>
            Editor verified
          </span>
        </div>
        <ListingList
          listings={listings}
          selectedId={selectedId}
          onSelect={handleSelect}
        />
      </aside>
    </div>
  );
}

function getBandStyle(listing: PublicListing): CSSProperties {
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
