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
            <span className="eyebrow">Evidence snapshot</span>
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
              {formatDetailSummary(listing)}
            </p>
          </div>
          <section className="detail-score-card" aria-label="Cooling scores">
            <ScoreRows listing={listing} layout="panel" />
            <p className="score-note">
              Guest Signal uses cooling mentions and reports. Editor Score is a
              separate human check. <Link href="/guest-signal">Formula</Link>.
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
            <strong>{formatCoolingMentionCount(listing.reviewCountAnalyzed)} read</strong>
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
            <h2>What we found</h2>
            <p className="evidence">{listing.evidenceSummary}</p>
          </section>
          <section className="detail-panel booking-panel">
            <span className="eyebrow">Booking path</span>
            <h2>Open Booking.com</h2>
            <p className="evidence">
              Confirm the exact room&apos;s AC setup before checkout.
            </p>
            {listing.affiliateUrl ? (
              <a className="booking-link" href={`/api/affiliate-click?id=${listing.id}`}>
                Open Booking.com
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

function formatDetailSummary(listing: PublicListing) {
  const acType = listing.acType
    ? `${formatAcType(listing.acType)} AC`
    : "AC type not confirmed";
  const mentionCount = formatCoolingMentionCount(listing.reviewCountAnalyzed);

  if (listing.guestSignalStatus === "unverified") {
    return `${acType}. ${mentionCount} reviewed. Not enough evidence to score cooling yet.`;
  }

  return `${acType}. ${mentionCount} reviewed. Guest Signal and Editor Score stay separate.`;
}

function formatCoolingMentionCount(count: number) {
  return `${count} cooling ${count === 1 ? "mention" : "mentions"}`;
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
