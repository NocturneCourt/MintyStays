import { describe, expect, it } from "vitest";
import {
  contributionToExcerpt,
  contributionToSentiment,
  getClientIpFromHeaders,
  isDisputeVote,
  MAX_DISPUTES_PER_LISTING_IP_PER_DAY,
} from "@/lib/contributions/contributionService";

describe("contribution service helpers", () => {
  it("classifies dispute votes separately from confirmations", () => {
    expect(isDisputeVote("confirm_cold")).toBe(false);
    expect(isDisputeVote("dispute_weak")).toBe(true);
    expect(isDisputeVote("broken")).toBe(true);
  });

  it("maps anonymous votes to Guest Signal sentiments", () => {
    expect(contributionToSentiment("confirm_cold")).toBe("positive");
    expect(contributionToSentiment("dispute_weak")).toBe("negative");
    expect(contributionToSentiment("broken")).toBe("negative");
  });

  it("keeps anonymous comments attached to auditable excerpts", () => {
    expect(
      contributionToExcerpt({
        listingId: "listing-1",
        sessionId: "session-1",
        vote: "broken",
        comment: "Wall unit would not turn on.",
      }),
    ).toContain("Wall unit would not turn on.");
  });

  it("caps disputes at 3 per listing per IP per day", () => {
    expect(MAX_DISPUTES_PER_LISTING_IP_PER_DAY).toBe(3);
  });

  it("reads client IP from forwarded headers", () => {
    expect(
      getClientIpFromHeaders(
        new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.9");
    expect(getClientIpFromHeaders(new Headers({ "x-real-ip": "198.51.100.2" }))).toBe(
      "198.51.100.2",
    );
    expect(getClientIpFromHeaders(new Headers())).toBeNull();
  });
});
