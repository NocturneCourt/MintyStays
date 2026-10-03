"use client";

import type { CSSProperties } from "react";
import { useEffect, useRef, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { Map, NavigationControl, setWorkerUrl } from "maplibre-gl";
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
  darkStyleUrl,
}: {
  city: PublicCity;
  listings: PublicListing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  styleUrl: string;
  darkStyleUrl: string;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [positions, setPositions] = useState<Record<string, PinPosition>>({});
  const [mapError, setMapError] = useState(false);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initialTheme = document.documentElement.dataset.theme === "dark";
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    setMapError(false);
    try {
      mapRef.current = new Map({
        container: containerRef.current,
        style: initialTheme ? darkStyleUrl : styleUrl,
        center: [city.lng, city.lat],
        zoom: 12,
      });
    } catch {
      const frame = window.requestAnimationFrame(() => setMapError(true));
      return () => window.cancelAnimationFrame(frame);
    }
    const map = mapRef.current;
    map.addControl(new NavigationControl(), "top-right");
    const handleMapError = () => setMapError(true);
    const handleMapLoad = () => setMapReady(true);
    map.on("error", handleMapError);
    map.on("load", handleMapLoad);

    return () => {
      map.off("error", handleMapError);
      map.off("load", handleMapLoad);
      map.remove();
      mapRef.current = null;
    };
  }, [city.lat, city.lng, darkStyleUrl, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let activeTheme =
      document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    const syncMapTheme = () => {
      const nextTheme =
        document.documentElement.dataset.theme === "dark" ? "dark" : "light";
      if (nextTheme === activeTheme) return;
      activeTheme = nextTheme;
      setMapError(false);
      map.setStyle(nextTheme === "dark" ? darkStyleUrl : styleUrl);
    };
    const observer = new MutationObserver(syncMapTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, [darkStyleUrl, styleUrl]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let frame = 0;
    const syncPinPositions = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setPositions(getDeconflictedPositions(listings, map));
      });
    };

    syncPinPositions();
    map.on("load", syncPinPositions);
    map.on("styledata", syncPinPositions);
    map.on("move", syncPinPositions);
    map.on("resize", syncPinPositions);

    return () => {
      window.cancelAnimationFrame(frame);
      map.off("load", syncPinPositions);
      map.off("styledata", syncPinPositions);
      map.off("move", syncPinPositions);
      map.off("resize", syncPinPositions);
    };
  }, [listings]);

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
      <div
        ref={containerRef}
        className="map-canvas"
        aria-label="Listings map"
        data-map-ready={mapReady}
      />
      {mapError ? (
        <div className="map-error" role="status">
          Map unavailable. Browse and select stays in the list.
        </div>
      ) : null}
      <div className="static-pin-layer" aria-label="Map pins">
        {listings.map((listing) => {
          const position = positions[listing.id];
          const pin = getPinPresentation(listing);
          const positionStyle = position
            ? {
                left: `${position.left}px`,
                top: `${position.top}px`,
              }
            : {
                left: "50%",
                top: "50%",
                opacity: 0,
              };

          return (
            <button
              key={listing.id}
              type="button"
              className={`pin ${pin.className} ${
                listing.id === selectedId ? "is-selected" : ""
              }`}
              style={{
                ...positionStyle,
                ...pin.style,
              }}
              aria-label={getPinAriaLabel(listing, pin.kind)}
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

function getPinAriaLabel(listing: PublicListing, kind: PinPresentation["kind"]) {
  if (kind === "guest" && listing.guestSignalScore != null) {
    return `Select ${listing.name}; Guest Signal ${listing.guestSignalScore} out of 100`;
  }

  if (kind === "editor" && listing.editorScore) {
    return `Select ${listing.name}; Editor Score ${formatEditorPinScore(listing.editorScore)}`;
  }

  return `Select ${listing.name}; Guest Signal unverified`;
}

function formatEditorPinScore(score: NonNullable<PublicListing["editorScore"]>) {
  return score.replace("verified_", "").replace("_", " ");
}

type PinPosition = {
  left: number;
  top: number;
};

function getDeconflictedPositions(
  listings: PublicListing[],
  map: Map,
): Record<string, PinPosition> {
  const placed: Array<{ left: number; top: number }> = [];
  const positions: Record<string, PinPosition> = {};
  const { clientWidth: width, clientHeight: height } = map.getContainer();
  const safeAreas = [
    // Map console and navigation controls occupy the top corners.
    { left: 0, top: 0, right: 360, bottom: 142 },
    { left: Math.max(0, width - 78), top: 0, right: width, bottom: 124 },
    // Keep the Cold Index legend and attribution readable at the bottom.
    {
      left: Math.max(0, (width - 470) / 2),
      top: Math.max(0, height - 122),
      right: Math.min(width, (width + 470) / 2),
      bottom: height,
    },
  ];

  for (const listing of listings) {
    const point = map.project([listing.lng, listing.lat]);
    const offset = findPinOffset(point.x, point.y, placed, safeAreas);
    const position = {
      left: point.x + offset.left,
      top: point.y + offset.top,
    };
    positions[listing.id] = position;
    placed.push(position);
  }

  return positions;
}

function findPinOffset(
  left: number,
  top: number,
  placed: Array<{ left: number; top: number }>,
  safeAreas: Array<{ left: number; top: number; right: number; bottom: number }>,
) {
  const minimumDistance = 42;
  const candidates = [{ left: 0, top: 0 }];

  for (let radius = 24; radius <= 96; radius += 24) {
    for (let step = 0; step < 8; step += 1) {
      const angle = (step / 8) * Math.PI * 2;
      candidates.push({
        left: Math.round(Math.cos(angle) * radius),
        top: Math.round(Math.sin(angle) * radius),
      });
    }
  }

  return (
    candidates.find(
      (candidate) =>
        placed.every((position) => {
          const dx = left + candidate.left - position.left;
          const dy = top + candidate.top - position.top;
          return Math.hypot(dx, dy) >= minimumDistance;
        }) &&
        safeAreas.every((area) => {
          const pinLeft = left + candidate.left - 25;
          const pinRight = left + candidate.left + 25;
          const pinTop = top + candidate.top - 20;
          const pinBottom = top + candidate.top + 20;
          return (
            pinRight < area.left ||
            pinLeft > area.right ||
            pinBottom < area.top ||
            pinTop > area.bottom
          );
        }),
    ) ?? candidates[candidates.length - 1]
  );
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

function createPin(kind: "guest" | "editor", index: ColdIndexResult): PinPresentation {
  return {
    kind,
    className: `is-${kind} band-${index.band}`,
    style: {
      "--pin-color": index.solid,
      "--pin-soft": index.soft,
    } as CSSProperties,
  };
}
