import { afterEach, describe, expect, it, vi } from "vitest";
import { ServiceUnavailableError } from "@/lib/http/errors";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("fail closed listing loaders", () => {
  it("throws 503 when DATABASE_URL is set and DB query rejects", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@127.0.0.1:59999/mintystays");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("LAUNCH_CITY_SLUG", "lisbon");

    vi.doMock("@/db/client", () => {
      const failingQuery = {
        from() {
          return failingQuery;
        },
        where() {
          return failingQuery;
        },
        limit() {
          return Promise.reject(new Error("connection refused"));
        },
        then(
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          return Promise.reject(new Error("connection refused")).then(
            onFulfilled,
            onRejected,
          );
        },
      };

      return {
        db: {
          select() {
            return failingQuery;
          },
          execute() {
            return Promise.reject(new Error("connection refused"));
          },
        },
      };
    });

    vi.doMock("@/db/schema", () => ({
      cities: {
        id: "id",
        slug: "slug",
        lat: "lat",
        lng: "lng",
        name: "name",
        country: "country",
        isActive: "is_active",
      },
      listings: {
        id: "id",
        cityId: "city_id",
        status: "status",
        lat: "lat",
        lng: "lng",
        type: "type",
        trustTier: "trust_tier",
        guestSignalScore: "guest_signal_score",
        evidenceSummary: "evidence_summary",
      },
    }));

    const { getPublicListings } = await import("@/lib/listings/getPublicListings");
    const { getListingDetail } = await import("@/lib/listings/getListingDetail");
    const { getActiveCity } = await import("@/lib/cities/getActiveCity");

    await expect(getPublicListings()).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    await expect(
      getListingDetail("11111111-1111-4111-8111-111111111111"),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);
    await expect(getActiveCity()).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );

    try {
      await getPublicListings();
    } catch (error) {
      expect(error).toMatchObject({ statusCode: 503 });
    }
  });
});
