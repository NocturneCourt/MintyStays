import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Home,
  MapPin,
  Snowflake,
} from "lucide-react";
import Link from "next/link";
import type { PublicListing } from "@/lib/listings/types";
import { AnonymousContributionForm } from "./AnonymousContributionForm";
import { InsiderReportForm } from "./InsiderReportForm";
import { ScoreRows } from "./ScoreRows";
import { TrustBadge } from "./TrustBadge";

type ListingDetailAuthState =
  | { enabled: false }
  | {
      enabled: true;
      canAccessInsider: boolean;
      canAccessEditor: boolean;
    };

export function ListingDetail({
  listing,
  authState = { enabled: false },
}: {
  listing: PublicListing;
  authState?: ListingDetailAuthState;
}) {
  return (
    <main className="detail-shell">
      <article className="detail-main">
        <Link className="detail-back" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          Back to map
        </Link>
        <div className="detail-hero">
          <div className="detail-intro">
            <TrustBadge tier={listing.trustTier} />
            <span className="eyebrow">Cooling dossier</span>
            <h1>{listing.name}</h1>
            <p className="listing-meta detail-meta">
              {listing.type === "hotel" ? (
                <Building2 size={15} aria-hidden="true" />
              ) : (
                <Home size={15} aria-hidden="true" />
              )}
              {listing.type === "hotel" ? "Hotel" : "Short-term rental"}
              {listing.address ? (
                <>
                  <span aria-hidden="true">/</span>
                  <MapPin size={15} aria-hidden="true" />
                  {listing.address}
                </>
              ) : null}
            </p>
            <p className="detail-summary">
              {listing.acType ? `${formatAcType(listing.acType)} AC` : "AC type unknown"} with{" "}
              {listing.reviewCountAnalyzed} cooling signals reviewed. Guest
              Signal and Editor Score stay separate so cooling risk is easier to
              judge before booking.
            </p>
          </div>
          <section className="detail-score-card" aria-label="Cooling scores">
            <ScoreRows listing={listing} layout="panel" />
            <p className="score-note">
              Guest Signal is computed from review and contribution data. Editor
              Score is a separate human verification layer and is never averaged
              into Guest Signal.
            </p>
          </section>
        </div>

        <section className="detail-facts" aria-label="Listing facts">
          <div>
            <Snowflake size={18} aria-hidden="true" />
            <span>AC type</span>
            <strong>{listing.acType ? formatAcType(listing.acType) : "Unknown"}</strong>
          </div>
          <div>
            <MapPin size={18} aria-hidden="true" />
            <span>Evidence</span>
            <strong>{listing.reviewCountAnalyzed} signals read</strong>
          </div>
          <div>
            <ExternalLink size={18} aria-hidden="true" />
            <span>Booking</span>
            <strong>{listing.affiliateUrl ? "Tracked link" : "Unavailable"}</strong>
          </div>
        </section>

        <div className="detail-grid">
          <section className="detail-panel">
            <span className="eyebrow">Evidence</span>
            <h2>Cooling read</h2>
            <p className="evidence">{listing.evidenceSummary}</p>
          </section>
          <section className="detail-panel booking-panel">
            <span className="eyebrow">Booking path</span>
            <h2>Check the room</h2>
            <p className="evidence">
              Use the outbound booking path, then confirm AC specifics before
              checkout.
            </p>
            {listing.affiliateUrl ? (
              <a className="booking-link" href={`/api/affiliate-click?id=${listing.id}`}>
                Open booking path
                <ExternalLink size={16} aria-hidden="true" />
              </a>
            ) : null}
          </section>
        </div>

        <section className="detail-panel contribution-panel">
          <AnonymousContributionForm listingId={listing.id} />
        </section>
        {authState.enabled ? (
          <section className="member-controls">
            {authState.canAccessInsider ? (
              <InsiderReportForm listingId={listing.id} />
            ) : (
              <Link className="secondary-link" href="/api/auth/signin">
                Sign in
              </Link>
            )}
            {authState.canAccessEditor ? (
              <Link
                className="secondary-link"
                href={`/admin/listings/${listing.id}`}
              >
                Edit editorial fields
              </Link>
            ) : null}
          </section>
        ) : null}
      </article>
    </main>
  );
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
