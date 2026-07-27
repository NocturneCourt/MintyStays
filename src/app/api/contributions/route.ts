import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  attachAnonymousSessionCookie,
  attachContributionHistoryCookie,
  getOrCreateAnonymousSession,
  hasFallbackContribution,
} from "@/lib/contributions/sessionIdentity";
import {
  getClientIpFromHeaders,
  isDisputeVote,
  submitAnonymousContribution,
} from "@/lib/contributions/contributionService";
import { getListingDetail } from "@/lib/listings/getListingDetail";

const contributionSchema = z.object({
  listingId: z.string().min(1),
  vote: z.enum(["confirm_cold", "dispute_weak", "broken"]),
  comment: z.string().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const parsed = contributionSchema.safeParse(await request.json().catch(() => null));

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid contribution payload" },
      { status: 400 },
    );
  }

  const listing = await getListingDetail(parsed.data.listingId);

  if (!listing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const { sessionId } = getOrCreateAnonymousSession(request);
  const clientIp = getClientIpFromHeaders(request.headers);
  const reviewNeeded = isDisputeVote(parsed.data.vote);

  if (!process.env.DATABASE_URL || !isUuid(parsed.data.listingId)) {
    const duplicate = hasFallbackContribution(request, parsed.data.listingId);
    const response = NextResponse.json(
      {
        status: duplicate ? "duplicate" : "created",
        // Disputes stay public; only flag for review (no auto-hide).
        listingStatus: "active",
        reviewNeeded,
        persisted: false,
      },
      { status: duplicate ? 409 : 201 },
    );
    attachAnonymousSessionCookie(response, sessionId);

    if (!duplicate) {
      attachContributionHistoryCookie(request, response, parsed.data.listingId);
    }

    return response;
  }

  const { db } = await import("@/db/client");
  const result = await submitAnonymousContribution(db, {
    listingId: parsed.data.listingId,
    sessionId,
    vote: parsed.data.vote,
    comment: parsed.data.comment,
    clientIp,
  });

  if (result.status === "rate_limited") {
    const response = NextResponse.json(
      {
        ...result,
        error: "Too many disputes for this listing from your network today.",
        persisted: true,
      },
      { status: 429 },
    );
    attachAnonymousSessionCookie(response, sessionId);
    return response;
  }

  const response = NextResponse.json(
    {
      ...result,
      persisted: true,
    },
    { status: result.status === "duplicate" ? 409 : 201 },
  );
  attachAnonymousSessionCookie(response, sessionId);

  return response;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );
}
