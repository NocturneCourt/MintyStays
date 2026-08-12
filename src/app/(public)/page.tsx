import Link from "next/link";
import { Snowflake } from "lucide-react";
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
