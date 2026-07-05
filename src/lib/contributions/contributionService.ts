import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { validateContributionInvariant } from "@/db/invariants";
import { listings, reviewSignals, userContributions } from "@/db/schema";

export type ContributionVote = "confirm_cold" | "dispute_weak" | "broken";

export type AnonymousContributionInput = {
  listingId: string;
  sessionId: string;
  vote: ContributionVote;
  comment?: string;
};

export type ContributionResult = {
  status: "created" | "duplicate";
  listingStatus: "active" | "disputed";
};

export async function submitAnonymousContribution(
  db: DbClient,
  input: AnonymousContributionInput,
): Promise<ContributionResult> {
  validateContributionInvariant({
    contributorType: "anonymous",
    sessionId: input.sessionId,
    userId: null,
  });

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
      listingStatus: isDisputeVote(input.vote) ? "disputed" : "active",
    };
  }

  const now = new Date();

  return db.transaction(async (tx) => {
    await tx.insert(userContributions).values({
      listingId: input.listingId,
      contributorType: "anonymous",
      sessionId: input.sessionId,
      vote: input.vote,
      comment: input.comment,
    });

    await tx.insert(reviewSignals).values({
      listingId: input.listingId,
      source: "anonymous",
      rawExcerpt: contributionToExcerpt(input),
      coolingSentiment: contributionToSentiment(input.vote),
      acTypeHint: undefined,
      weight: "1.25",
      authoredAt: now,
      extractedAt: now,
    });

    const listingStatus = isDisputeVote(input.vote) ? "disputed" : "active";

    if (listingStatus === "disputed") {
      await tx
        .update(listings)
        .set({
          status: "disputed",
          updatedAt: now,
        })
        .where(eq(listings.id, input.listingId));
    }

    return {
      status: "created",
      listingStatus,
    };
  });
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
