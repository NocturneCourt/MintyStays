import { describe, expect, it } from "vitest";
import {
  contributionToExcerpt,
  contributionToSentiment,
  isDisputeVote,
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
});
