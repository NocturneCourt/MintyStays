import { and, eq, gte, inArray } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { validateContributionInvariant } from "@/db/invariants";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";

export type ContributionVote = "confirm_cold" | "dispute_weak" | "broken";

export const MAX_DISPUTES_PER_LISTING_IP_PER_DAY = 3;

export type AnonymousContributionInput = {
  listingId: string;
  sessionId: string;
  vote: ContributionVote;
  comment?: string;
  clientIp?: string | null;
  now?: Date;
};

export type ContributionResult = {
  status: "created" | "duplicate" | "rate_limited";
  /** Public visibility status after write. Disputes no longer auto-hide. */
  listingStatus: "active";
  reviewNeeded: boolean;
  guestSignal?: Awaited<ReturnType<typeof recomputeListingSignals>>;
};

type AnonymousContributionOptions = {
  recomputeListingSignals?: typeof recomputeListingSignals;
};

export async function submitAnonymousContribution(
  db: DbClient,
  input: AnonymousContributionInput,
  options: AnonymousContributionOptions = {},
): Promise<ContributionResult> {
  validateContributionInvariant({
    contributorType: "anonymous",
    sessionId: input.sessionId,
    userId: null,
  });

  const now = input.now ?? new Date();
  const reviewNeeded = isDisputeVote(input.vote);

  const existing = await db
    .select({ id: userContributions.id })
    .from(userContributions)
    .where(
      and(
        eq(userContributions.listingId, input.listingId),
        eq(userContributions.sessionId, input.sessionId),
      ),
    )
    .limit(1);

  if (existing.length) {
    return {
      status: "duplicate",
      listingStatus: "active",
      reviewNeeded,
    };
  }

  if (reviewNeeded && input.clientIp) {
    const limited = await isDisputeRateLimited(db, {
      listingId: input.listingId,
      clientIp: input.clientIp,
      now,
    });

    if (limited) {
      return {
        status: "rate_limited",
        listingStatus: "active",
        reviewNeeded: true,
      };
    }
  }

  await db.transaction(async (tx) => {
    await tx.insert(userContributions).values({
      listingId: input.listingId,
      contributorType: "anonymous",
      sessionId: input.sessionId,
      clientIp: input.clientIp ?? null,
      vote: input.vote,
      comment: input.comment,
    });

    await tx.insert(reviewSignals).values({
      listingId: input.listingId,
      source: "anonymous",
      rawExcerpt: contributionToExcerpt(input),
      coolingSentiment: contributionToSentiment(input.vote),
      acTypeHint: undefined,
      authoredAt: now,
      extractedAt: now,
    });

    // Disputes flag for editor review; listing stays public (active) until an editor acts.
    if (reviewNeeded) {
      await tx
        .update(listings)
        .set({
          reviewNeeded: true,
          updatedAt: now,
        })
        .where(eq(listings.id, input.listingId));
    }
  });

  const recompute = options.recomputeListingSignals ?? recomputeListingSignals;

  return {
    status: "created",
    listingStatus: "active",
    reviewNeeded,
    guestSignal: await recompute(db, input.listingId, now),
  };
}

export async function isDisputeRateLimited(
  db: Pick<DbClient, "select">,
  input: { listingId: string; clientIp: string; now?: Date },
) {
  const now = input.now ?? new Date();
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const recentDisputes = await db
    .select({ id: userContributions.id })
    .from(userContributions)
    .where(
      and(
        eq(userContributions.listingId, input.listingId),
        eq(userContributions.clientIp, input.clientIp),
        inArray(userContributions.vote, ["dispute_weak", "broken"]),
        gte(userContributions.createdAt, dayAgo),
      ),
    );

  return recentDisputes.length >= MAX_DISPUTES_PER_LISTING_IP_PER_DAY;
}

export function isDisputeVote(vote: ContributionVote) {
  return vote === "dispute_weak" || vote === "broken";
}

export function contributionToSentiment(
  vote: ContributionVote,
): "positive" | "negative" {
  return vote === "confirm_cold" ? "positive" : "negative";
}

export function contributionToExcerpt(input: AnonymousContributionInput) {
  const label =
    input.vote === "confirm_cold"
      ? "Anonymous visitor confirmed cold AC."
      : input.vote === "dispute_weak"
        ? "Anonymous visitor disputed cooling strength."
        : "Anonymous visitor reported broken AC.";

  return input.comment?.trim() ? `${label} ${input.comment.trim()}` : label;
}

export function getClientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip")?.trim();
  return realIp || null;
}
