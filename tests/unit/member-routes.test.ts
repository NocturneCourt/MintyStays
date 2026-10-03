import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("member write routes", () => {
  it("keeps Insider and Editor routes unavailable when auth is disabled", async () => {
    vi.stubEnv("AUTH_ENABLED", "false");
    const { POST } = await import("@/app/api/insider/reports/route");
    const { PATCH } = await import("@/app/api/editor/listings/[id]/route");
    expect((await POST(request("POST", {}))).status).toBe(404);
    expect((await PATCH(request("PATCH", {}), context("bad-id"))).status).toBe(404);
  });

  it("rejects invalid database listing IDs as client errors", async () => {
    vi.stubEnv("AUTH_ENABLED", "true");
    const { POST } = await import("@/app/api/insider/reports/route");
    const { PATCH } = await import("@/app/api/editor/listings/[id]/route");
    expect(
      (await POST(request("POST", { listingId: "bad-id", vote: "broken" }))).status,
    ).toBe(400);
    expect(
      (await PATCH(request("PATCH", { isHandpicked: true }), context("bad-id"))).status,
    ).toBe(400);
  });

  it("reports session infrastructure failures as service unavailable", async () => {
    vi.stubEnv("AUTH_ENABLED", "true");
    vi.stubEnv("DATABASE_URL", "postgres://unavailable");
    vi.doMock("@/lib/auth/authOptions", () => ({
      buildAuthOptions: vi.fn().mockRejectedValue(new Error("Database unavailable")),
    }));
    const { POST } = await import("@/app/api/insider/reports/route");
    const { PATCH } = await import("@/app/api/editor/listings/[id]/route");
    const listingId = "11111111-1111-4111-8111-111111111111";
    expect((await POST(request("POST", { listingId, vote: "broken" }))).status).toBe(
      503,
    );
    expect(
      (await PATCH(request("PATCH", { isHandpicked: true }), context(listingId)))
        .status,
    ).toBe(503);
  });
});

function request(method: string, body: unknown) {
  return new NextRequest("http://localhost/api/test", {
    method,
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

function context(id: string) {
  return { params: Promise.resolve({ id }) };
}
