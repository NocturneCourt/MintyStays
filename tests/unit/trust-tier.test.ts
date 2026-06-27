import { describe, expect, it } from "vitest";
import { deriveTrustTier, describeTrustTier } from "@/lib/scoring/trustTier";

describe("deriveTrustTier", () => {
  it("uses editor_verified only when verification evidence and Editor Score exist", () => {
    expect(
      deriveTrustTier({
        guestSignalStatus: "scored",
        isHandpicked: true,
        editorScore: "verified_cold",
        editorVerifiedAt: new Date("2026-06-26T12:00:00Z"),
      }),
    ).toBe("editor_verified");
  });

  it("keeps Handpicked as curation rather than verification", () => {
    expect(
      deriveTrustTier({
        guestSignalStatus: "scored",
        isHandpicked: true,
        editorScore: null,
        editorVerifiedAt: null,
      }),
    ).toBe("handpicked");

    expect(describeTrustTier("handpicked")).toContain("not direct verification");
  });

  it("falls back to scored and unverified from Guest Signal state", () => {
    expect(deriveTrustTier({ guestSignalStatus: "scored" })).toBe("scored");
    expect(deriveTrustTier({ guestSignalStatus: "unverified" })).toBe("unverified");
  });
});
