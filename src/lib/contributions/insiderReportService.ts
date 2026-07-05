import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { validateContributionInvariant } from "@/db/invariants";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";
import {
  contributionToSentiment,
  isDisputeVote,
  type ContributionVote,
} from "./contributionService";

export type InsiderReportInput = {
  listingId: string;
  userId: string;
  vote: ContributionVote;
  comment?: string;
  now?: Date;
};

export type InsiderReportResult = {
  status: "created" | "duplicate";
  listingStatus: "active" | "disputed";
  guestSignal?: Awaited<ReturnType<typeof recomputeListingSignals>>;
};

type InsiderReportOptions = {
  recomputeListingSignals?: typeof recomputeListingSignals;
};

export async function submitInsiderReport(
  db: DbClient,
  input: InsiderReportInput,
  options: InsiderReportOptions = {},
): Promise<InsiderReportResult> {
  validateContributionInvariant({
    contributorType: "insider",
    sessionId: null,
    userId: input.userId,
  });

  const existing = await db
    .select({ id: userContributions.id })
    .from(userContributions)
    .where(
      and(
        eq(userContributions.listingId, input.listingId),
        eq(userContributions.userId, input.userId),
      ),
    )
    .limit(1);

  const listingStatus = isDisputeVote(input.vote) ? "disputed" : "active";

  if (existing.length) {
    return {
      status: "duplicate",
      listingStatus,
    };
  }

  const now = input.now ?? new Date();

  await db.transaction(async (tx) => {
    await tx.insert(userContributions).values({
      listingId: input.listingId,
      contributorType: "insider",
      userId: input.userId,
      sessionId: null,
      vote: input.vote,
      comment: input.comment,
    });

    await tx.insert(reviewSignals).values({
      listingId: input.listingId,
      source: "insider",
      rawExcerpt: insiderReportToExcerpt(input),
      coolingSentiment: contributionToSentiment(input.vote),
      acTypeHint: undefined,
      weight: "2.50",
      authoredAt: now,
      extractedAt: now,
    });

    if (listingStatus === "disputed") {
      await tx
        .update(listings)
        .set({
          status: "disputed",
          updatedAt: now,
        })
        .where(eq(listings.id, input.listingId));
    }
  });

  const recompute = options.recomputeListingSignals ?? recomputeListingSignals;

  return {
    status: "created",
    listingStatus,
    guestSignal: await recompute(db, input.listingId, now),
  };
}

export function insiderReportToExcerpt(input: InsiderReportInput) {
  const label =
    input.vote === "confirm_cold"
      ? "Insider Member confirmed cold AC."
      : input.vote === "dispute_weak"
        ? "Insider Member disputed cooling strength."
        : "Insider Member reported broken AC.";

  return input.comment?.trim() ? `${label} ${input.comment.trim()}` : label;
}
