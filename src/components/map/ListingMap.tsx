"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef } from "react";
import { BadgeCheck } from "lucide-react";
import maplibregl, { type Map } from "maplibre-gl";
import {
  coldIndex,
  coldIndexForEditorScore,
  type ColdIndexResult,
} from "@/lib/design/coldIndex";
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
        const prefersReducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        ).matches;

        if (prefersReducedMotion) {
          map.jumpTo({ center: [selected.lng, selected.lat], zoom: 14 });
        } else {
          map.flyTo({
            center: [selected.lng, selected.lat],
            zoom: 14,
            essential: true,
          });
        }
      }
    }
  }, [listings, onSelect, selectedId]);

  return (
    <>
      <div ref={containerRef} className="map-canvas" aria-label="Listings map" />
      <div className="static-pin-layer" aria-label="Map pins">
        {listings.map((listing) => {
          const position = positions[listing.id];
          const pin = getPinPresentation(listing);

          return (
            <button
              key={listing.id}
              type="button"
              className={`pin ${pin.className} ${
                listing.id === selectedId ? "is-selected" : ""
              }`}
              style={{
                left: `${position.left}%`,
                top: `${position.top}%`,
                ...pin.style,
              }}
              aria-label={`Select ${listing.name}`}
              onClick={() => onSelect(listing.id)}
            >
              {pin.kind === "guest" ? (
                <span>{listing.guestSignalScore}</span>
              ) : pin.kind === "editor" ? (
                <BadgeCheck size={17} aria-hidden="true" />
              ) : (
                <span className="pin-dot" aria-hidden="true" />
              )}
              {pin.kind !== "unrated" ? (
                <small aria-hidden="true">{pin.kind === "guest" ? "G" : "E"}</small>
              ) : null}
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
      const x = 18 + ((listing.lng - minLng) / lngRange) * 68;
      const y = 18 + (1 - (listing.lat - minLat) / latRange) * 56;

      return [
        listing.id,
        {
          left: clamp(x, 18, 86),
          top: clamp(y, 18, 74),
        },
      ];
    }),
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

type PinPresentation =
  | {
      kind: "guest";
      className: string;
      style: CSSProperties;
    }
  | {
      kind: "editor";
      className: string;
      style: CSSProperties;
    }
  | {
      kind: "unrated";
      className: string;
      style: CSSProperties;
    };

function getPinPresentation(listing: PublicListing): PinPresentation {
  if (listing.guestSignalScore != null) {
    return createPin("guest", coldIndex(listing.guestSignalScore));
  }

  if (listing.editorScore) {
    return createPin("editor", coldIndexForEditorScore(listing.editorScore));
  }

  return {
    kind: "unrated",
    className: "is-unrated",
    style: {},
  };
}

function createPin(
  kind: "guest" | "editor",
  index: ColdIndexResult,
): PinPresentation {
  return {
    kind,
    className: `is-${kind} band-${index.band}`,
    style: {
      "--pin-color": index.solid,
      "--pin-soft": index.soft,
    } as CSSProperties,
  };
}
