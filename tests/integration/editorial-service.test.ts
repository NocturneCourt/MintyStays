import { describe, expect, it } from "vitest";
import type { DbClient } from "@/db/client";
import { listings } from "@/db/schema";
import {
  EditorialInvariantError,
  EditorialListingNotFoundError,
  updateEditorialListing,
} from "@/lib/editorial/editorialService";
import type { EditorScore, GuestSignalStatus, TrustTier } from "@/lib/scoring/trustTier";

type StoredListing = {
  id: string;
  isHandpicked: boolean;
  editorScore: EditorScore | null;
  editorVerifiedAt: Date | null;
  trustTier: TrustTier;
  guestSignalScore: number | null;
  guestSignalStatus: GuestSignalStatus;
};

type StoredUpdate = Partial<StoredListing> & {
  updatedAt?: Date;
};

const listingId = "11111111-1111-4111-8111-111111111111";
const now = new Date("2026-06-26T12:00:00Z");

describe("editorial service", () => {
  it("updates editorial fields without altering Guest Signal", async () => {
    const { db, state } = createEditorialTestDb({
      id: listingId,
      isHandpicked: false,
      editorScore: null,
      editorVerifiedAt: null,
      trustTier: "scored",
      guestSignalScore: 82,
      guestSignalStatus: "scored",
    });

    const result = await updateEditorialListing(db, {
      listingId,
      isHandpicked: true,
      editorVerified: true,
      editorScore: "verified_cold",
      now,
    });

    expect(result).toMatchObject({
      listingId,
      isHandpicked: true,
      editorScore: "verified_cold",
      editorVerifiedAt: now,
      trustTier: "editor_verified",
      guestSignalScore: 82,
      guestSignalStatus: "scored",
    });
    expect(state.listing).toMatchObject({
      isHandpicked: true,
      editorScore: "verified_cold",
      editorVerifiedAt: now,
      trustTier: "editor_verified",
      guestSignalScore: 82,
      guestSignalStatus: "scored",
    });
    expect(state.updates[0]).not.toHaveProperty("guestSignalScore");
    expect(state.updates[0]).not.toHaveProperty("guestSignalStatus");
  });

  it("keeps Handpicked curation separate from Editor Verified evidence", async () => {
    const { db, state } = createEditorialTestDb({
      id: listingId,
      isHandpicked: false,
      editorScore: null,
      editorVerifiedAt: null,
      trustTier: "unverified",
      guestSignalScore: null,
      guestSignalStatus: "unverified",
    });

    const result = await updateEditorialListing(db, {
      listingId,
      isHandpicked: true,
      now,
    });

    expect(result).toMatchObject({
      isHandpicked: true,
      editorScore: null,
      editorVerifiedAt: null,
      trustTier: "handpicked",
      guestSignalScore: null,
      guestSignalStatus: "unverified",
    });
    expect(state.listing?.trustTier).toBe("handpicked");
    expect(state.listing?.editorVerifiedAt).toBeNull();
  });

  it("requires Editor Score when Editor Verified is set", async () => {
    const { db } = createEditorialTestDb({
      id: listingId,
      isHandpicked: true,
      editorScore: null,
      editorVerifiedAt: null,
      trustTier: "handpicked",
      guestSignalScore: 70,
      guestSignalStatus: "scored",
    });

    await expect(
      updateEditorialListing(db, {
        listingId,
        editorVerified: true,
        now,
      }),
    ).rejects.toBeInstanceOf(EditorialInvariantError);
  });

  it("reports missing listings", async () => {
    const { db } = createEditorialTestDb(null);

    await expect(
      updateEditorialListing(db, {
        listingId,
        isHandpicked: true,
      }),
    ).rejects.toBeInstanceOf(EditorialListingNotFoundError);
  });
});

function createEditorialTestDb(initialListing: StoredListing | null) {
  const state: {
    listing: StoredListing | null;
    updates: StoredUpdate[];
  } = {
    listing: initialListing ? { ...initialListing } : null,
    updates: [],
  };

  const db = {
    select() {
      const query = {
        from() {
          return query;
        },
        where() {
          return query;
        },
        async limit() {
          return state.listing ? [{ ...state.listing }] : [];
        },
      };

      return query;
    },
    update(table: unknown) {
      expect(table).toBe(listings);

      return {
        set(row: StoredUpdate) {
          state.updates.push(row);

          return {
            async where() {
              if (state.listing) {
                state.listing = {
                  ...state.listing,
                  ...row,
                };
              }
            },
          };
        },
      };
    },
  };

  return {
    db: db as unknown as DbClient,
    state,
  };
}
