import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("security headers", () => {
  it("defines baseline browser security headers for every route", async () => {
    const groups = await nextConfig.headers?.();
    const headers = new Map(
      (groups?.[0]?.headers ?? []).map((header) => [header.key, header.value]),
    );

    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
    expect(headers.get("Permissions-Policy")).toContain("geolocation=()");
    expect(headers.get("Strict-Transport-Security")).toContain("max-age=31536000");
  });
});
