import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import type { DbClient } from "@/db/client";
import { cities, listings, reviewSignals, userContributions, users } from "@/db/schema";
import { submitAnonymousContribution } from "@/lib/contributions/contributionService";
import { submitInsiderReport } from "@/lib/contributions/insiderReportService";
import { updateEditorialListing } from "@/lib/editorial/editorialService";
import { recomputeListingSignals } from "@/lib/scoring/recomputeListingSignals";

describe.skipIf(!process.env.DATABASE_URL)("PostgreSQL backend transactions", () => {
  let db: DbClient;
  let closeDatabase: () => Promise<unknown>;
  let cityId: string;
  let listingId: string;
  let userId: string;
  const now = new Date("2026-07-01T12:00:00Z");

  beforeAll(async () => {
    const client = await import("@/db/client");
    db = client.db;
    closeDatabase = () => client.sql.end({ timeout: 5 });
  });

  beforeEach(async () => {
    const [city] = await db
      .insert(cities)
      .values({
        slug: `backend-transactions-${randomUUID()}`,
        name: "Transaction test",
        country: "PT",
        lat: 38.7,
        lng: -9.1,
      })
      .returning({ id: cities.id });
    cityId = city.id;
    const [listing] = await db
      .insert(listings)
      .values({
        cityId,
        name: "Transaction test",
        type: "hotel",
        lat: 38.7,
        lng: -9.1,
        source: "manual",
        evidenceSummary: "Cooling test fixture.",
      })
      .returning({ id: listings.id });
    listingId = listing.id;
    const [user] = await db
      .insert(users)
      .values({ email: `${randomUUID()}@example.com` })
      .returning({ id: users.id });
    userId = user.id;
  });

  afterEach(async () => {
    if (cityId) await db.delete(cities).where(eq(cities.id, cityId));
    if (userId) await db.delete(users).where(eq(users.id, userId));
  });
  afterAll(async () => {
    await closeDatabase?.();
  });

  it("rolls back votes, signals, and review flags when recomputation fails", async () => {
    const failure = new Error("Score update failed");
    const options = {
      async recomputeListingSignals(): Promise<never> {
        throw failure;
      },
    };
    await expect(
      submitAnonymousContribution(
        db,
        {
          listingId,
          sessionId: randomUUID(),
          vote: "broken",
          now,
        },
        options,
      ),
    ).rejects.toBe(failure);
    await expect(
      submitInsiderReport(
        db,
        {
          listingId,
          userId,
          vote: "broken",
          now,
        },
        options,
      ),
    ).rejects.toBe(failure);
    expect(
      await db
        .select()
        .from(userContributions)
        .where(eq(userContributions.listingId, listingId)),
    ).toHaveLength(0);
    expect(
      await db
        .select()
        .from(reviewSignals)
        .where(eq(reviewSignals.listingId, listingId)),
    ).toHaveLength(0);
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId));
    expect(listing.reviewNeeded).toBe(false);
    expect(listing.guestSignalScore).toBeNull();
  });

  it("accepts one simultaneous vote per anonymous session and Insider user", async () => {
    const sessionId = randomUUID();
    const anonymous = await Promise.all(
      Array.from({ length: 4 }, () =>
        submitAnonymousContribution(db, {
          listingId,
          sessionId,
          vote: "confirm_cold",
          now,
        }),
      ),
    );
    const insider = await Promise.all(
      Array.from({ length: 4 }, () =>
        submitInsiderReport(db, { listingId, userId, vote: "confirm_cold", now }),
      ),
    );
    for (const results of [anonymous, insider]) {
      expect(results.filter((result) => result.status === "created")).toHaveLength(1);
      expect(results.filter((result) => result.status === "duplicate")).toHaveLength(3);
    }
    expect(
      await db
        .select()
        .from(reviewSignals)
        .where(eq(reviewSignals.listingId, listingId)),
    ).toHaveLength(2);
  });

  it("enforces the dispute cap during simultaneous submissions", async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        submitAnonymousContribution(db, {
          listingId,
          sessionId: randomUUID(),
          clientIp: "203.0.113.10",
          vote: "broken",
          now,
        }),
      ),
    );
    expect(results.filter((result) => result.status === "created")).toHaveLength(3);
    expect(results.filter((result) => result.status === "rate_limited")).toHaveLength(
      5,
    );
    const [listing] = await db
      .select()
      .from(listings)
      .where(eq(listings.id, listingId));
    expect(listing.reviewCountAnalyzed).toBe(3);
    expect(listing.reviewNeeded).toBe(true);
  });

  it("keeps the final score and editorial trust consistent during concurrent writes", async () => {
    await Promise.all([
      ...Array.from({ length: 6 }, () =>
        submitAnonymousContribution(db, {
          listingId,
          sessionId: randomUUID(),
          vote: "confirm_cold",
          now,
        }),
      ),
      updateEditorialListing(db, {
        listingId,
        editorVerified: true,
        editorScore: "verified_cold",
        now,
      }),
      recomputeListingSignals(db, listingId, now),
    ]);
    const [listing] = await db
      .select()
      .from(listings)
      .where(and(eq(listings.id, listingId), eq(listings.cityId, cityId)));
    expect(listing).toMatchObject({
      reviewCountAnalyzed: 6,
      guestSignalStatus: "scored",
      editorScore: "verified_cold",
      trustTier: "editor_verified",
    });
    expect(listing.editorVerifiedAt).toEqual(now);
    const finalSignal = await recomputeListingSignals(db, listingId, now);
    expect(listing.guestSignalScore).toBe(finalSignal.score);
  });
});
