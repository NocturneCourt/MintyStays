import Link from "next/link";
import { BadgeCheck, Gauge, Snowflake } from "lucide-react";
import { getActiveCity } from "@/lib/cities/getActiveCity";
import { isAuthEnabled } from "@/lib/auth/featureFlag";
import { getPublicListings } from "@/lib/listings/getPublicListings";
import { parseListingFilters } from "@/lib/listings/listingFilters";
import { MapExplorer } from "@/components/map/MapExplorer";
import { ThemeToggle } from "@/components/app/ThemeToggle";

type PublicPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PublicPage({ searchParams }: PublicPageProps) {
  const params = await searchParams;
  const filters = parseListingFilters(params);
  const city = await getActiveCity();
  const listings = await getPublicListings(filters);
  const styleUrl =
    process.env.MAP_STYLE_URL ?? "https://tiles.openfreemap.org/styles/positron";
  const scoredListings = listings.filter(
    (listing) => listing.guestSignalStatus === "scored",
  );
  const editorVerifiedCount = listings.filter(
    (listing) => listing.trustTier === "editor_verified",
  ).length;
  const topGuestSignal = scoredListings.length
    ? Math.max(
        ...scoredListings.map((listing) => listing.guestSignalScore ?? 0),
      )
    : null;

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Snowflake size={20} />
          </span>
          <span>
            <strong>MintyStays</strong>
            <small>Actually cold stays / {city.name}</small>
          </span>
        </div>
        <div className="topbar-actions">
          <span className="topbar-signal">
            <Gauge size={16} aria-hidden="true" />
            <span>
              <small>Guest Signal</small>
              <strong>
                {topGuestSignal != null ? `${topGuestSignal}` : "Pending"}
              </strong>
            </span>
          </span>
          <span className="topbar-signal">
            <BadgeCheck size={16} aria-hidden="true" />
            <span>
              <small>Editor Score</small>
              <strong>{editorVerifiedCount} verified</strong>
            </span>
          </span>
          <ThemeToggle />
          <Link className="topbar-link" href="/guest-signal">
            Formula
          </Link>
          {isAuthEnabled() ? (
            <Link className="topbar-link" href="/api/auth/signin">
              Sign in
            </Link>
          ) : null}
        </div>
      </header>
      <MapExplorer
        city={city}
        listings={listings}
        filters={filters}
        styleUrl={styleUrl}
      />
    </main>
  );
}
