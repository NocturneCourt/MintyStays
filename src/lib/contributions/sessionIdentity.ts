import { nanoid } from "nanoid";
import type { NextRequest, NextResponse } from "next/server";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const SESSION_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;
const MAX_HISTORY_ENTRIES = 64;
// Keep the encoded value below common browser cookie limits, including the
// cookie name and attributes added by the response layer.
const MAX_HISTORY_COOKIE_LENGTH = 3_800;

export function getSessionCookieName() {
  return process.env.SESSION_COOKIE_NAME ?? "mintystays_session";
}

export function getContributionHistoryCookieName() {
  return `${getSessionCookieName()}_votes`;
}

export function getOrCreateAnonymousSession(request: NextRequest) {
  const cookieName = getSessionCookieName();
  const existing = request.cookies.get(cookieName)?.value;

  if (existing && SESSION_ID_PATTERN.test(existing)) {
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
  if (!raw || raw.length > MAX_HISTORY_COOKIE_LENGTH) return [];

  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (value): value is string => typeof value === "string" && value.length <= 160,
      )
      .slice(-MAX_HISTORY_ENTRIES);
  } catch {
    return [];
  }
}

export function hasFallbackContribution(request: NextRequest, listingId: string) {
  return getContributionHistory(request).includes(listingId);
}

export function attachContributionHistoryCookie(
  request: NextRequest,
  response: NextResponse,
  listingId: string,
) {
  const history = new Set(getContributionHistory(request));
  history.add(listingId);
  const encodedHistory = encodeHistory([...history].slice(-MAX_HISTORY_ENTRIES));

  response.cookies.set(
    getContributionHistoryCookieName(),
    encodedHistory,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: ONE_YEAR_SECONDS,
    },
  );
}

function encodeHistory(entries: string[]) {
  let boundedEntries = entries;
  let encoded = encodeHistoryEntries(boundedEntries);

  while (encoded.length > MAX_HISTORY_COOKIE_LENGTH && boundedEntries.length > 1) {
    boundedEntries = boundedEntries.slice(1);
    encoded = encodeHistoryEntries(boundedEntries);
  }

  return encoded;
}

function encodeHistoryEntries(entries: string[]) {
  return Buffer.from(JSON.stringify(entries)).toString("base64url");
}
