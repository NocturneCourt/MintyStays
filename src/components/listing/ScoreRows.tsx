import type { CSSProperties } from "react";
import {
  coldIndex,
  coldIndexForEditorScore,
  type ColdBand,
} from "@/lib/design/coldIndex";
import type { PublicListing } from "@/lib/listings/types";

export function ScoreRows({
  listing,
  layout = "compact",
}: {
  listing: PublicListing;
  layout?: "compact" | "panel";
}) {
  const hasGuestScore = listing.guestSignalScore != null;
  const guestIndex = hasGuestScore
    ? coldIndex(listing.guestSignalScore ?? 0)
    : null;
  const editorIndex = listing.editorScore
    ? coldIndexForEditorScore(listing.editorScore)
    : null;
  const confidence = formatConfidence(listing.guestSignalConfidence);
  const coolingMentionLabel = formatCoolingMentionCount(
    listing.reviewCountAnalyzed,
  );

  return (
    <div className={`score-rows ${layout}`} aria-label="Cooling score details">
      <div className="dual-gauge">
        <section className="gauge guest-gauge" aria-label="Guest Signal">
          <div className="gauge-top">
            <span className="gauge-label">Guest Signal</span>
            <span
              className="gauge-value"
              style={guestIndex ? { color: guestIndex.solid } : undefined}
            >
              {hasGuestScore ? `${listing.guestSignalScore}/100` : "Unscored"}
            </span>
          </div>
          {hasGuestScore ? (
            <span className="gauge-track" aria-hidden="true">
              <span
                className="gauge-fill"
                style={{
                  width: `${listing.guestSignalScore}%`,
                  background: guestIndex?.solid,
                }}
              />
              <span
                className="gauge-hatch"
                style={getHatchStyle(
                  listing.guestSignalScore ?? 0,
                  listing.guestSignalConfidence,
                )}
              />
            </span>
          ) : (
            <span className="gauge-chip">
              {coolingMentionLabel} found. Needs 3 to score.
            </span>
          )}
          {hasGuestScore ? (
            <span className="gauge-conf">
              <span className={`conf-dot ${confidence}`} aria-hidden="true" />
              {listing.reviewCountAnalyzed} cooling mentions / {confidence} confidence
            </span>
          ) : null}
          {guestIndex ? (
            <span className="gauge-caption">{guestIndex.label}</span>
          ) : null}
        </section>
        <span className="gauge-divider" aria-hidden="true" />
        <section className="gauge editor-gauge" aria-label="Editor Score">
          <div className="gauge-top">
            <span className="gauge-label">Editor Score</span>
            <span
              className="gauge-value"
              style={editorIndex ? { color: editorIndex.solid } : undefined}
            >
              {listing.editorScore
                ? formatEditorScore(listing.editorScore)
                : "Not reviewed"}
            </span>
          </div>
          {listing.editorScore ? (
            <span className="gauge-notches" aria-hidden="true">
              {(["glacier", "temperate", "warm", "hot"] as ColdBand[]).map(
                (band) => (
                  <span
                    key={band}
                    className={editorIndex?.band === band ? "is-active" : ""}
                    style={
                      editorIndex?.band === band
                        ? ({ "--notch-color": editorIndex.solid } as CSSProperties)
                        : undefined
                    }
                  />
                ),
              )}
            </span>
          ) : null}
          <span className="gauge-caption">
            {editorIndex ? `${editorIndex.label} / editor check` : "No editor check yet"}
          </span>
        </section>
      </div>
      <p className="dual-gauge-note">Guest data and editor checks stay separate.</p>
    </div>
  );
}

function formatCoolingMentionCount(count: number) {
  return `${count} cooling ${count === 1 ? "mention" : "mentions"}`;
}

function formatConfidence(confidence: PublicListing["guestSignalConfidence"]) {
  if (!confidence) return "low";
  return confidence;
}

function getHatchStyle(
  score: number,
  confidence: PublicListing["guestSignalConfidence"],
): CSSProperties {
  const width = confidence === "high" ? 8 : confidence === "moderate" ? 16 : 24;
  const left = Math.max(0, Math.min(100, score - width / 2));

  return {
    left: `${left}%`,
    width: `${Math.min(width, 100 - left)}%`,
  };
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
