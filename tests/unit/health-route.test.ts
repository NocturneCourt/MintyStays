import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.restoreAllMocks();
});

describe("GET /api/health", () => {
  it("reports healthy when env is valid and no DB is required", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mintystays.com");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.databaseConfigured).toBe(false);
    expect(body.database.ok).toBe(true);
  });

  it("reports healthy when the serving schema is initialized", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost:1/mintystays");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mintystays.com");

    const limit = vi.fn().mockResolvedValue([]);
    const from = vi.fn((_table: unknown) => ({ limit }));
    const db = { select: vi.fn(() => ({ from })) };
    vi.doMock("@/db/client", () => ({
      db,
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();
    const { cities, listings } = await import("@/db/schema");

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.database.ok).toBe(true);
    expect(db.select).toHaveBeenCalledTimes(2);
    expect(from.mock.calls.map(([table]) => table)).toEqual([cities, listings]);
    expect(limit).toHaveBeenCalledTimes(2);
    expect(limit).toHaveBeenCalledWith(0);
  });

  it("returns 503 for a missing serving column without exposing database details", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost:1/mintystays");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mintystays.com");

    const { listings } = await import("@/db/schema");
    const from = vi.fn((table: unknown) => ({
      limit: vi.fn().mockImplementation(() => {
        if (table === listings) {
          throw new Error(
            'column "photo_gallery" of relation "listings" does not exist at db.internal:5432 password=secret',
          );
        }
        return Promise.resolve([]);
      }),
    }));
    const db = { select: vi.fn(() => ({ from })) };
    vi.doMock("@/db/client", () => ({ db }));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();
    const responseBody = JSON.stringify(body);

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.database.ok).toBe(false);
    expect(body.database.error).toBe("Database probe failed");
    expect(responseBody).not.toContain("photo_gallery");
    expect(responseBody).not.toContain("db.internal");
    expect(responseBody).not.toContain("secret");
  });

  it("returns 503 in production when DATABASE_URL is missing", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mintystays.com");

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.database.ok).toBe(false);
  });
});
