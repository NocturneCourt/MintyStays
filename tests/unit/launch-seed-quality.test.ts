import { describe, expect, it } from "vitest";
import { getSeedListings } from "@/lib/listings/seedData";

describe("launch seed quality", () => {
  it("includes scored Guest Signal, Handpicked, and Editor Verified listings", () => {
    const listings = getSeedListings();

    const scored = listings.filter(
      (listing) =>
        listing.guestSignalStatus === "scored" && listing.guestSignalScore != null,
    );
    const handpicked = listings.filter(
      (listing) => listing.trustTier === "handpicked",
    );
    const editorVerified = listings.filter(
      (listing) => listing.trustTier === "editor_verified",
    );

    expect(scored.length).toBeGreaterThan(0);
    expect(handpicked.length).toBeGreaterThan(0);
    expect(editorVerified.length).toBeGreaterThan(0);

    const artStay = listings.find(
      (listing) => listing.name === "Lisbon Art Stay Hotel & Apartments",
    );
    expect(artStay).toMatchObject({
      guestSignalStatus: "scored",
      reviewCountAnalyzed: 3,
    });
    expect(artStay?.guestSignalScore).toBeGreaterThanOrEqual(50);

    expect(
      listings.find((listing) => listing.name === "Lisbon 5 Hotel")?.trustTier,
    ).toBe("handpicked");
    expect(
      listings.find((listing) => listing.name === "Be Poet Baixa Hotel"),
    ).toMatchObject({
      trustTier: "editor_verified",
      editorScore: "verified_cold",
    });
  });
});
