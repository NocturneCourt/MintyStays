"use client";

import { useEffect, useRef } from "react";
import maplibregl, { type Map } from "maplibre-gl";
import type { PublicCity, PublicListing } from "@/lib/listings/types";

export function ListingMap({
  city,
  listings,
  selectedId,
  onSelect,
  styleUrl,
}: {
  city: PublicCity;
  listings: PublicListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  styleUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const positions = projectListings(listings);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapRef.current = new maplibregl.Map({
      container: containerRef.current,
      style: styleUrl,
      center: [city.lng, city.lat],
      zoom: 12,
      attributionControl: false,
    });
    mapRef.current.addControl(new maplibregl.NavigationControl(), "top-right");

    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [city.lat, city.lng, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedId) {
      const selected = listings.find((listing) => listing.id === selectedId);
      if (selected) {
        map.flyTo({ center: [selected.lng, selected.lat], zoom: 14, essential: true });
      }
    }
  }, [listings, onSelect, selectedId]);

  return (
    <>
      <div ref={containerRef} className="map-canvas" aria-label="Listings map" />
      <div className="static-pin-layer" aria-label="Map pins">
        {listings.map((listing) => {
          const position = positions[listing.id];

          return (
            <button
              key={listing.id}
              type="button"
              className={`pin ${listing.id === selectedId ? "is-selected" : ""}`}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
              }}
              aria-label={`Select ${listing.name}`}
              onClick={() => onSelect(listing.id)}
            >
              <span>{listing.guestSignalScore ?? "?"}</span>
            </button>
          );
        })}
      </div>
    </>
  );
}

function projectListings(listings: PublicListing[]) {
  const lats = listings.map((listing) => listing.lat);
  const lngs = listings.map((listing) => listing.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const latRange = Math.max(maxLat - minLat, 0.01);
  const lngRange = Math.max(maxLng - minLng, 0.01);

  return Object.fromEntries(
    listings.map((listing) => {
      const x = 15 + ((listing.lng - minLng) / lngRange) * 70;
      const y = 15 + (1 - (listing.lat - minLat) / latRange) * 70;

      return [
        listing.id,
        {
          left: clamp(x, 12, 88),
          top: clamp(y, 12, 88),
        },
      ];
    }),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
