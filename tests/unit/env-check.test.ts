import { describe, expect, it } from "vitest";
import { checkLaunchEnv } from "@/lib/config/env";

describe("checkLaunchEnv", () => {
  it("rejects missing production storage and insecure public origins", () => {
    const result = checkLaunchEnv({ NODE_ENV: "production" });
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "DATABASE_URL is required in production.",
        "NEXT_PUBLIC_SITE_URL must use HTTPS in production.",
      ]),
    );
  });

  it("checks the canonical hostname rather than a URL substring", () => {
    const result = checkLaunchEnv({
      NEXT_PUBLIC_SITE_URL: "https://mintystays.com.example.org",
    });
    expect(result.warnings).toContain("NEXT_PUBLIC_SITE_URL is not mintystays.com.");
  });

  it("keeps auth optional for the public launch", () => {
    const result = checkLaunchEnv({
      AUTH_ENABLED: "false",
      NEXT_PUBLIC_SITE_URL: "https://mintystays.com",
    });

    expect(result.errors).toEqual([]);
    expect(result.env.AUTH_ENABLED).toBe("false");
    expect(result.warnings).toContain(
      "DATABASE_URL is not set; public pages use local seed data only outside production.",
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
        "NEXTAUTH_URL is required when AUTH_ENABLED=true.",
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

  it("accepts a separate dark map style URL", () => {
    const result = checkLaunchEnv({
      MAP_STYLE_URL: "https://tiles.openfreemap.org/styles/positron",
      MAP_STYLE_URL_DARK: "https://tiles.openfreemap.org/styles/dark",
      NEXT_PUBLIC_SITE_URL: "https://mintystays.com",
    });

    expect(result.errors).toEqual([]);
    expect(result.env.MAP_STYLE_URL_DARK).toBe(
      "https://tiles.openfreemap.org/styles/dark",
    );
  });
});
