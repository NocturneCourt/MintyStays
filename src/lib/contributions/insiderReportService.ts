import { and, eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { validateContributionInvariant } from "@/db/invariants";
import { listings, reviewSignals, userContributions } from "@/db/schema";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";
import {
  contributionToSentiment,
  isUniqueViolation,
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
  /** Public visibility status after write. Disputes no longer auto-hide. */
  listingStatus: "active";
  reviewNeeded: boolean;
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

  const now = input.now ?? new Date();
  const reviewNeeded = isDisputeVote(input.vote);

  const recompute = options.recomputeListingSignals ?? recomputeListingSignals;

  try {
    return await db.transaction(async (tx): Promise<InsiderReportResult> => {
      await tx
        .select({ id: listings.id })
        .from(listings)
        .where(eq(listings.id, input.listingId))
        .for("update");

      const existing = await tx
        .select({ id: userContributions.id })
        .from(userContributions)
        .where(
          and(
            eq(userContributions.listingId, input.listingId),
            eq(userContributions.userId, input.userId),
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

      await tx.insert(userContributions).values({
        listingId: input.listingId,
        contributorType: "insider",
        userId: input.userId,
        sessionId: null,
        vote: input.vote,
        comment: input.comment,
        createdAt: now,
      });

      await tx.insert(reviewSignals).values({
        listingId: input.listingId,
        source: "insider",
        rawExcerpt: insiderReportToExcerpt(input),
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

      return {
        status: "created",
        listingStatus: "active",
        reviewNeeded,
        guestSignal: await recompute(tx, input.listingId, now),
      };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "duplicate",
        listingStatus: "active",
        reviewNeeded,
      };
    }
    throw error;
  }
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
