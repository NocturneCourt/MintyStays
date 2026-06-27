import { describe, expect, it } from "vitest";
import { buildAffiliateLink } from "@/lib/affiliate/AffiliateLinkBuilder";

describe("buildAffiliateLink", () => {
  it("builds Booking.com-style tracked links", () => {
    const url = new URL(
      buildAffiliateLink({
        baseUrl: "https://example.com/hotel",
        provider: "booking",
        partnerId: "partner-123",
        campaign: "lisbon",
      }),
    );

    expect(url.searchParams.get("aid")).toBe("partner-123");
    expect(url.searchParams.get("utm_source")).toBe("mintystays");
    expect(url.searchParams.get("utm_campaign")).toBe("lisbon");
  });
});
