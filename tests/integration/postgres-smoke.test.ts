import { randomUUID } from "node:crypto";
import type { DbClient } from "@/db/client";
import { afterAll, describe, expect, it } from "vitest";

const databaseConfigured = Boolean(process.env.DATABASE_URL);
let closeDatabase: (() => Promise<unknown>) | undefined;

describe.skipIf(!databaseConfigured)("PostgreSQL smoke path", () => {
  it("uses the real database for health, listing, contribution, and rollback paths", async () => {
    const [{ db, sql: postgresClient }, { cities, listings, userContributions }, { eq }, { sql }, { submitAnonymousContribution }] =
      await Promise.all([
        import("@/db/client"),
        import("@/db/schema"),
        import("drizzle-orm"),
        import("drizzle-orm"),
        import("@/lib/contributions/contributionService"),
      ]);
    closeDatabase = () => postgresClient.end({ timeout: 5 });

    await db.execute(sql`select 1`);

    const citySlug = process.env.LAUNCH_CITY_SLUG ?? "lisbon";
    const [city] = await db
      .select({ id: cities.id })
      .from(cities)
      .where(eq(cities.slug, citySlug))
      .limit(1);
    if (!city) {
      throw new Error(`Smoke database has no launch city: ${citySlug}`);
    }

    const [listing] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(eq(listings.cityId, city.id))
      .limit(1);
    if (!listing) {
      throw new Error(`Smoke database has no listing for city: ${citySlug}`);
    }

    const sessionId = `postgres-smoke-${randomUUID()}`;
    const rollback = new Error("ROLLBACK_POSTGRES_SMOKE");

    try {
      await db.transaction(async (tx) => {
        const result = await submitAnonymousContribution(tx as unknown as DbClient, {
          listingId: listing.id,
          sessionId,
          vote: "confirm_cold",
          comment: "Disposable PostgreSQL smoke contribution.",
          now: new Date("2026-07-01T12:00:00Z"),
        });

        expect(result.status).toBe("created");
        const [storedContribution] = await tx
          .select({ id: userContributions.id })
          .from(userContributions)
          .where(eq(userContributions.sessionId, sessionId))
          .limit(1);
        expect(storedContribution).toBeTruthy();

        throw rollback;
      });
    } catch (error) {
      expect(error).toBe(rollback);
    }

    const persistedRows = await db
      .select({ id: userContributions.id })
      .from(userContributions)
      .where(eq(userContributions.sessionId, sessionId));
    expect(persistedRows).toHaveLength(0);
  }, 30_000);
});

afterAll(async () => {
  await closeDatabase?.();
});
