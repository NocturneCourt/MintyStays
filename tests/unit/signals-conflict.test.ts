import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ScoreRows } from "@/components/listing/ScoreRows";
import { SignalsConflictNotice } from "@/components/listing/SignalsConflictNotice";
import type { PublicListing } from "@/lib/listings/types";
import { hasSignalsConflict } from "@/lib/scoring/signalsConflict";

const listing: PublicListing = {
  id: "conflict-listing",
  name: "Conflict Stay",
  type: "hotel",
  lat: 38.72,
  lng: -9.14,
  cityId: "lisbon",
  source: "test",
  guestSignalScore: 82,
  guestSignalStatus: "scored",
  guestSignalConfidence: "moderate",
  editorScore: "verified_broken",
  signalsConflict: true,
  trustTier: "editor_verified",
  evidenceSummary: "Guest reports and the direct editor check differ.",
  reviewCountAnalyzed: 6,
};

describe("Guest and Editor signal conflict", () => {
  it("uses the documented 35-point conflict threshold", () => {
    expect(
      hasSignalsConflict({
        guestSignalScore: 74,
        editorScore: "verified_weak",
      }),
    ).toBe(false);
    expect(
      hasSignalsConflict({
        guestSignalScore: 75,
        editorScore: "verified_weak",
      }),
    ).toBe(true);
    expect(
      hasSignalsConflict({
        guestSignalScore: null,
        editorScore: "verified_broken",
      }),
    ).toBe(false);
  });

  it("shows the warning while preserving both independent scores", () => {
    const markup = renderToStaticMarkup(
      createElement(
        "div",
        null,
        createElement(ScoreRows, { listing, layout: "panel" }),
        createElement(SignalsConflictNotice, { listing, variant: "panel" }),
      ),
    );

    expect(markup).toContain("Signals disagree");
    expect(markup).toContain("82/100");
    expect(markup).toContain("Verified Broken");
    expect(markup).toContain("Both scores remain visible and unchanged");
  });
});
