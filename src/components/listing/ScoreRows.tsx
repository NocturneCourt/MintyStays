import type { CSSProperties } from "react";
import type { PublicListing } from "@/lib/listings/types";

export function ScoreRows({
  listing,
  layout = "compact",
}: {
  listing: PublicListing;
  layout?: "compact" | "panel";
}) {
  const guestScore = listing.guestSignalScore ?? 0;

  return (
    <div className={`score-rows ${layout}`} aria-label="Cooling score details">
      <div className="score-row">
        <div className="score-copy">
          <span className="score-label">Guest Signal</span>
          <span className="score-track" aria-hidden="true">
            <span
              style={{ "--score": `${guestScore}%` } as CSSProperties}
            />
          </span>
        </div>
        <span className="score-value">
          {listing.guestSignalScore == null
            ? "Unverified"
            : `${listing.guestSignalScore}/100`}
        </span>
      </div>
      <div className="score-row">
        <div className="score-copy">
          <span className="score-label">Editor Score</span>
          <span className="score-caption">Human layer, shown separately</span>
        </div>
        <span className="score-value">
          {listing.editorScore ? formatEditorScore(listing.editorScore) : "Not set"}
        </span>
      </div>
    </div>
  );
}

function formatEditorScore(score: NonNullable<PublicListing["editorScore"]>) {
  switch (score) {
    case "verified_cold":
      return "Verified Cold";
    case "verified_adequate":
      return "Verified Adequate";
    case "verified_weak":
      return "Verified Weak";
    case "verified_broken":
      return "Verified Broken";
  }
}
