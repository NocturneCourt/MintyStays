import { nanoid } from "nanoid";
import type { NextRequest, NextResponse } from "next/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? "mintystays_session";
}

export function getContributionHistoryCookieName() {
  return `${getSessionCookieName()}_votes`;
}

export function getOrCreateAnonymousSession(request: NextRequest) {
  const cookieName = getSessionCookieName();
  const existing = request.cookies.get(cookieName)?.value;

  if (existing) {
    return { sessionId: existing, isNew: false };
  }

  return { sessionId: nanoid(32), isNew: true };
}

export function attachAnonymousSessionCookie(
  response: NextResponse,
  sessionId: string,
) {
  response.cookies.set(getSessionCookieName(), sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ONE_YEAR_SECONDS,
  });
}

export function getContributionHistory(request: NextRequest) {
  const raw = request.cookies.get(getContributionHistoryCookieName())?.value;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return [];
  }
}

export function hasFallbackContribution(
  request: NextRequest,
  listingId: string,
) {
  return getContributionHistory(request).includes(listingId);
}

export function attachContributionHistoryCookie(
  request: NextRequest,
  response: NextResponse,
  listingId: string,
) {
  const history = new Set(getContributionHistory(request));
  history.add(listingId);

  response.cookies.set(
    getContributionHistoryCookieName(),
    Buffer.from(JSON.stringify([...history])).toString("base64url"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    },
  );
}
