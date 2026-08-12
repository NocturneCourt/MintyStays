"use client";

import { useCallback, useState } from "react";
import type { ListingFilters } from "@/lib/listings/listingFilters";
import type { PublicCity, PublicListing } from "@/lib/listings/types";
import { ListingList } from "@/components/listing/ListingList";
import { MapFilters } from "@/components/map/MapFilters";
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
  const [selectedId, setSelectedId] = useState<string | null>(listings[0]?.id ?? null);
  const handleSelect = useCallback((id: string) => setSelectedId(id), []);
  const selectedListing =
    listings.find((listing) => listing.id === selectedId) ?? listings[0] ?? null;
  const scoredCount = listings.filter(
    (listing) => listing.guestSignalStatus === "scored",
  ).length;
  const editorVerifiedCount = listings.filter(
    (listing) => listing.trustTier === "editor_verified",
  ).length;

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
      </section>
      <aside className="list-pane intelligence-pane">
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
