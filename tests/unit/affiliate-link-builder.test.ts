import { describe, expect, it } from "vitest";
import {
  AffiliateUrlNotAllowedError,
  buildAffiliateLink,
  isAllowedAffiliateUrl,
} from "@/lib/affiliate/AffiliateLinkBuilder";

describe("buildAffiliateLink", () => {
  it("builds Booking.com-style tracked links", () => {
    const url = new URL(
      buildAffiliateLink({
        baseUrl: "https://www.booking.com/hotel/pt/cold-test.html",
        provider: "booking",
        partnerId: "partner-123",
        campaign: "lisbon",
      }),
    );

    expect(url.hostname).toBe("www.booking.com");
    expect(url.searchParams.get("aid")).toBe("partner-123");
    expect(url.searchParams.get("utm_source")).toBe("mintystays");
    expect(url.searchParams.get("utm_campaign")).toBe("lisbon");
  });

  it("allows airbnb, trivago, and localhost for development", () => {
    expect(
      isAllowedAffiliateUrl("https://www.airbnb.com/rooms/123"),
    ).toBe(true);
    expect(
      isAllowedAffiliateUrl("https://www.trivago.com/en-US/lm/hotels-lisbon"),
    ).toBe(true);
    expect(isAllowedAffiliateUrl("http://localhost:3000/hotel")).toBe(true);
    expect(isAllowedAffiliateUrl("http://127.0.0.1:3000/hotel")).toBe(true);
  });

  it("rejects malicious or non-allowlisted hosts with 400 semantics", () => {
    expect(isAllowedAffiliateUrl("https://evil.com/phish")).toBe(false);
    expect(isAllowedAffiliateUrl("https://booking.com.evil.com/x")).toBe(false);
    expect(isAllowedAffiliateUrl("http://www.booking.com/hotel")).toBe(false);

    expect(() =>
      buildAffiliateLink({
        baseUrl: "https://evil.com/phish",
        provider: "generic",
      }),
    ).toThrow(AffiliateUrlNotAllowedError);

    try {
      buildAffiliateLink({ baseUrl: "https://evil.com/phish" });
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 400 });
    }
  });
});
