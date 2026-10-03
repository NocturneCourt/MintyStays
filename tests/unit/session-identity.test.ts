import { NextRequest, NextResponse } from "next/server";
import { describe, expect, it } from "vitest";
import {
  attachAnonymousSessionCookie,
  getOrCreateAnonymousSession,
  getContributionHistory,
} from "@/lib/contributions/sessionIdentity";

describe("anonymous session identity", () => {
  it("keeps a valid opaque session cookie", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: "mintystays_session=abcdefghijklmnopQRSTUV12_-" },
    });

    expect(getOrCreateAnonymousSession(request)).toEqual({
      sessionId: "abcdefghijklmnopQRSTUV12_-",
      isNew: false,
    });
  });

  it("rotates malformed or unexpectedly short cookies", () => {
    const request = new NextRequest("http://localhost/", {
      headers: { cookie: "mintystays_session=bad%20value" },
    });

    const session = getOrCreateAnonymousSession(request);

    expect(session.isNew).toBe(true);
    expect(session.sessionId).toMatch(/^[A-Za-z0-9_-]{32}$/);
  });

  it("attaches a hardened cookie for the generated session", () => {
    const response = NextResponse.json({ ok: true });

    attachAnonymousSessionCookie(response, "abcdefghijklmnopQRSTUV12_-");

    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("mintystays_session=abcdefghijklmnopQRSTUV12_-");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=lax");
    expect(cookie).toContain("Max-Age=31536000");
  });

  it("ignores oversized fallback history cookies", () => {
    const request = new NextRequest("http://localhost/", {
      headers: {
        cookie: `mintystays_session_votes=${Buffer.from("x".repeat(20_000)).toString("base64url")}`,
      },
    });

    expect(getContributionHistory(request)).toEqual([]);
  });
});
