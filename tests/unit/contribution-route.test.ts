import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableError } from "@/lib/http/errors";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("POST /api/contributions", () => {
  it("returns 503 when the listing database read is unavailable", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@127.0.0.1:59999/mintystays");
    vi.doMock("@/lib/listings/getListingDetail", () => ({
      getListingDetail: vi
        .fn()
        .mockRejectedValue(new ServiceUnavailableError("connection refused")),
    }));

    const { POST } = await import("@/app/api/contributions/route");
    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Contribution service is temporarily unavailable",
    });
  });

  it("returns 503 when the contribution write fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@127.0.0.1:59999/mintystays");
    vi.doMock("@/lib/listings/getListingDetail", () => ({
      getListingDetail: vi.fn().mockResolvedValue({
        id: "11111111-1111-4111-8111-111111111111",
      }),
    }));
    vi.doMock("@/lib/contributions/contributionService", () => ({
      getClientIpFromHeaders: vi.fn().mockReturnValue(null),
      isDisputeVote: vi.fn().mockReturnValue(false),
      submitAnonymousContribution: vi
        .fn()
        .mockRejectedValue(new Error("connection refused")),
    }));

    const { POST } = await import("@/app/api/contributions/route");
    const response = await POST(createRequest());

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      error: "Contribution service is temporarily unavailable",
    });
  });
});

function createRequest() {
  return new NextRequest("http://localhost/api/contributions", {
    method: "POST",
    body: JSON.stringify({
      listingId: "11111111-1111-4111-8111-111111111111",
      vote: "confirm_cold",
    }),
    headers: { "content-type": "application/json" },
  });
}
