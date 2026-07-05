import { describe, expect, it } from "vitest";
import { checkLaunchEnv } from "@/lib/config/env";

describe("checkLaunchEnv", () => {
  it("keeps auth optional for the public launch", () => {
    const result = checkLaunchEnv({
      AUTH_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "https://mintystays.com",
    });

    expect(result.errors).toEqual([]);
    expect(result.env.AUTH_ENABLED).toBe("false");
    expect(result.warnings).toContain(
      "DATABASE_URL is not set; public pages will use seed fallback data.",
    );
  });

  it("requires database, secret, and email settings when auth is enabled", () => {
    const result = checkLaunchEnv({
      AUTH_ENABLED: "true",
      NEXT_PUBLIC_SITE_URL: "https://mintystays.com",
    });

    expect(result.errors).toEqual(
      expect.arrayContaining([
        "DATABASE_URL is required when AUTH_ENABLED=true.",
        "AUTH_SECRET is required when AUTH_ENABLED=true.",
        "EMAIL_FROM and EMAIL_PROVIDER_API_KEY are required when AUTH_ENABLED=true.",
      ]),
    );
  });

  it("flags malformed public URLs", () => {
    const result = checkLaunchEnv({
      NEXT_PUBLIC_SITE_URL: "mintystays",
    });

    expect(result.errors[0]).toContain("NEXT_PUBLIC_SITE_URL");
  });
});
