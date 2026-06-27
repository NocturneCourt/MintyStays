"use client";

import type { PublicListing } from "@/lib/listings/types";
import { ListingCard } from "./ListingCard";

export function ListingList({
  listings,
  selectedId,
  onSelect,
}: {
  listings: PublicListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (!listings.length) {
    return (
      <div className="map-empty">
        No cold-stay matches are available for these filters.
      </div>
    );
  }

  return (
    <div className="listing-list">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          selected={listing.id === selectedId}
          onSelect={() => onSelect(listing.id)}
        />
      ))}
    </div>
  );
}
