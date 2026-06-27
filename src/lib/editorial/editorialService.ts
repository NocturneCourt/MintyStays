import { eq } from "drizzle-orm";
import type { DbClient } from "@/db/client";
import { listings } from "@/db/schema";
import {
  deriveTrustTier,
  type EditorScore,
  type GuestSignalStatus,
  type TrustTier,
} from "@/lib/scoring/trustTier";

export class EditorialListingNotFoundError extends Error {
  constructor(listingId: string) {
    super(`Listing not found: ${listingId}`);
    this.name = "EditorialListingNotFoundError";
  }
}

export class EditorialInvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EditorialInvariantError";
  }
}

export type EditorialUpdateInput = {
  listingId: string;
  isHandpicked?: boolean;
  editorVerified?: boolean;
  editorScore?: EditorScore | null;
  now?: Date;
};

export type EditorialUpdateResult = {
  listingId: string;
  isHandpicked: boolean;
  editorScore: EditorScore | null;
  editorVerifiedAt: Date | null;
  trustTier: TrustTier;
  guestSignalScore: number | null;
  guestSignalStatus: GuestSignalStatus;
};

export async function updateEditorialListing(
  db: DbClient,
  input: EditorialUpdateInput,
): Promise<EditorialUpdateResult> {
  const [current] = await db
    .select({
      id: listings.id,
      isHandpicked: listings.isHandpicked,
      editorScore: listings.editorScore,
      editorVerifiedAt: listings.editorVerifiedAt,
      guestSignalScore: listings.guestSignalScore,
      guestSignalStatus: listings.guestSignalStatus,
    })
    .from(listings)
    .where(eq(listings.id, input.listingId))
    .limit(1);

  if (!current) {
    throw new EditorialListingNotFoundError(input.listingId);
  }

  const now = input.now ?? new Date();
  const nextIsHandpicked = input.isHandpicked ?? current.isHandpicked;
  const nextEditorVerifiedAt = resolveEditorVerifiedAt({
    current: current.editorVerifiedAt,
    requested: input.editorVerified,
    now,
  });
  const nextEditorScore =
    input.editorVerified === false
      ? null
      : "editorScore" in input
        ? input.editorScore ?? null
        : current.editorScore;

  if (nextEditorVerifiedAt && !nextEditorScore) {
    throw new EditorialInvariantError(
      "Editor Verified listings require an Editor Score",
    );
  }

  if (nextEditorScore && !nextEditorVerifiedAt) {
    throw new EditorialInvariantError(
      "Editor Score requires Editor Verified status",
    );
  }

  const trustTier = deriveTrustTier({
    guestSignalStatus: current.guestSignalStatus,
    isHandpicked: nextIsHandpicked,
    editorScore: nextEditorScore,
    editorVerifiedAt: nextEditorVerifiedAt,
  });

  await db
    .update(listings)
    .set({
      isHandpicked: nextIsHandpicked,
      editorScore: nextEditorScore,
      editorVerifiedAt: nextEditorVerifiedAt,
      trustTier,
      updatedAt: now,
    })
    .where(eq(listings.id, input.listingId));

  return {
    listingId: current.id,
    isHandpicked: nextIsHandpicked,
    editorScore: nextEditorScore,
    editorVerifiedAt: nextEditorVerifiedAt,
    trustTier,
    guestSignalScore: current.guestSignalScore,
    guestSignalStatus: current.guestSignalStatus,
  };
}

function resolveEditorVerifiedAt({
  current,
  requested,
  now,
}: {
  current: Date | null;
  requested?: boolean;
  now: Date;
}) {
  if (requested === true) {
    return current ?? now;
  }

  if (requested === false) {
    return null;
  }

  return current;
}
