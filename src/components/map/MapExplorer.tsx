"use client";

import { useCallback, useState } from "react";
import type { PublicCity, PublicListing } from "@/lib/listings/types";
import { ListingList } from "@/components/listing/ListingList";
import { ListingMap } from "./ListingMap";

export function MapExplorer({
  city,
  listings,
  styleUrl,
}: {
  city: PublicCity;
  listings: PublicListing[];
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
      </section>
      <aside className="list-pane">
        <div className="list-heading">
          <div>
            <span className="eyebrow">Cold-stay board</span>
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
