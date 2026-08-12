"use client";

import { useEffect, useRef } from "react";
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
  const cardRefs = useRef(new Map<string, HTMLElement>());
  const hasMounted = useRef(false);

  useEffect(() => {
    if (!hasMounted.current) {
      hasMounted.current = true;
      return;
    }

    if (!selectedId) return;

    const card = cardRefs.current.get(selectedId);
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    card?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "nearest",
    });
  }, [selectedId]);

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
          cardRef={(element) => {
            if (element) {
              cardRefs.current.set(listing.id, element);
            } else {
              cardRefs.current.delete(listing.id);
            }
          }}
        />
      ))}
    </div>
  );
}
