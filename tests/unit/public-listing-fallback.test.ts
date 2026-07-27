import { afterEach, describe, expect, it, vi } from "vitest";
import { getActiveCity } from "@/lib/cities/getActiveCity";
import {
  ServiceUnavailableError,
  shouldFailClosedOnDbError,
} from "@/lib/http/errors";
import { getListingDetail } from "@/lib/listings/getListingDetail";
import { getPublicListings } from "@/lib/listings/getPublicListings";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("public listing seed fallback", () => {
  it("loads the launch city without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    await expect(getActiveCity()).resolves.toMatchObject({
      slug: "lisbon",
      name: "Lisbon",
    });
  });

  it("loads public listings without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    const listings = await getPublicListings();

    expect(listings).toHaveLength(6);
    expect(listings.every((listing) => listing.evidenceSummary)).toBe(true);
  });

  it("applies bounding boxes to seed fallback listings", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    const listings = await getPublicListings({
      bounds: {
        minLat: 38.71,
        maxLat: 38.713,
        minLng: -9.14,
        maxLng: -9.13,
      },
    });

    expect(listings.map((listing) => listing.name)).toEqual([
      "Lisbon Art Stay Hotel & Apartments",
      "Be Poet Baixa Hotel",
    ]);
  });

  it("loads fallback listing details by seed id", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");

    await expect(
      getListingDetail("lisbon-art-stay-hotel-apartments-1"),
    ).resolves.toMatchObject({
      name: "Lisbon Art Stay Hotel & Apartments",
      editorScore: null,
    });
  });

  it("fails closed when DATABASE_URL is set (no silent seed fallback)", () => {
    expect(
      shouldFailClosedOnDbError({
        DATABASE_URL: "postgres://localhost/mintystays",
        NODE_ENV: "test",
      } as NodeJS.ProcessEnv),
    ).toBe(true);
  });

  it("fails closed in production without DATABASE_URL", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");

    await expect(getPublicListings()).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    await expect(getActiveCity()).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    await expect(
      getListingDetail("lisbon-art-stay-hotel-apartments-1"),
    ).rejects.toBeInstanceOf(ServiceUnavailableError);

    await expect(getPublicListings()).rejects.toMatchObject({
      statusCode: 503,
      message: expect.stringContaining("DATABASE_URL"),
    });
  });
});

describe("ServiceUnavailableError", () => {
  it("carries HTTP 503 semantics", () => {
    const error = new ServiceUnavailableError("db down");
    expect(error.statusCode).toBe(503);
    expect(error.name).toBe("ServiceUnavailableError");
    expect(error.message).toBe("db down");
  });
});
