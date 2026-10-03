import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("GET /api/affiliate-click", () => {
  it("redirects allowlisted booking.com affiliate URLs", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    vi.doMock("@/lib/listings/getListingDetail", () => ({
      getListingDetail: vi.fn().mockResolvedValue({
        id: "lisbon-art-stay-hotel-apartments-1",
        affiliateUrl:
          "https://www.booking.com/hotel/pt/lisbon-short-stay-apartments-baixa.html",
      }),
    }));

    const { GET } = await import("@/app/api/affiliate-click/route");
    const response = await GET(
      new Request(
        "http://localhost/api/affiliate-click?id=lisbon-art-stay-hotel-apartments-1",
      ),
    );

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain(
      "https://www.booking.com/hotel/pt/lisbon-short-stay-apartments-baixa.html",
    );
    expect(location).toContain("utm_source=mintystays");
  });

  it("rejects malicious affiliate hosts with 400", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    vi.doMock("@/lib/listings/getListingDetail", () => ({
      getListingDetail: vi.fn().mockResolvedValue({
        id: "evil-listing",
        affiliateUrl: "https://evil.com/phish",
      }),
    }));

    const { GET } = await import("@/app/api/affiliate-click/route");
    const response = await GET(
      new Request("http://localhost/api/affiliate-click?id=evil-listing"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toMatch(/not allowlisted|not allowed/i);
  });

  it("still redirects when click analytics are unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@localhost/mintystays");
    vi.stubEnv("NODE_ENV", "test");

    vi.doMock("@/lib/listings/getListingDetail", () => ({
      getListingDetail: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
        affiliateUrl: "https://www.booking.com/hotel/pt/cold-stay.html",
      }),
    }));
    vi.doMock("@/db/client", () => ({
      db: {
        insert: vi.fn(() => ({
          values: vi.fn().mockRejectedValue(new Error("analytics offline")),
        })),
      },
    }));
    vi.doMock("@/db/schema", () => ({ clickEvents: {} }));

    const { GET } = await import("@/app/api/affiliate-click/route");
    const response = await GET(
      new Request(
        "http://localhost/api/affiliate-click?id=11111111-1111-4111-8111-111111111111",
      ),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("booking.com");
  });
});
