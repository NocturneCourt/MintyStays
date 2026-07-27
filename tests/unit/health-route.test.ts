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

  it("returns 503 when DATABASE_URL is set and the DB probe fails", async () => {
    vi.stubEnv("DATABASE_URL", "postgres://localhost:1/mintystays");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("AUTH_ENABLED", "false");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://mintystays.com");

    vi.doMock("@/db/client", () => ({
      db: {
        execute: vi.fn().mockRejectedValue(new Error("connection refused")),
      },
    }));

    const { GET } = await import("@/app/api/health/route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.database.ok).toBe(false);
    expect(body.database.error).toMatch(/connection refused/i);
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
