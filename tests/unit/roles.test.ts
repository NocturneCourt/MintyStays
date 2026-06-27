import { describe, expect, it } from "vitest";
import {
  canAccessEditor,
  canAccessInsider,
  requireEditor,
  requireInsider,
  toAuthPrincipal,
} from "@/lib/auth/roles";

describe("role authorization helpers", () => {
  it("treats missing users as anonymous", () => {
    expect(toAuthPrincipal(null)).toEqual({ kind: "anonymous" });
    expect(canAccessInsider(null)).toBe(false);
    expect(canAccessEditor(null)).toBe(false);
  });

  it("denies unverified accounts even when a role is present", () => {
    const user = {
      id: "user-1",
      email: "member@example.com",
      role: "insider",
      emailVerified: null,
    };

    expect(toAuthPrincipal(user)).toEqual({ kind: "anonymous" });
    expect(canAccessInsider(user)).toBe(false);
  });

  it("allows verified Insider Members into Insider surfaces only", () => {
    const user = {
      id: "user-1",
      email: "member@example.com",
      role: "insider",
      emailVerified: new Date("2026-06-26T12:00:00Z"),
    };

    expect(canAccessInsider(user)).toBe(true);
    expect(canAccessEditor(user)).toBe(false);
    expect(() => requireInsider(user)).not.toThrow();
    expect(() => requireEditor(user)).toThrow("Editor access");
  });

  it("allows verified Editors into Insider and Editor surfaces", () => {
    const user = {
      id: "user-2",
      email: "editor@example.com",
      role: "editor",
      verifiedAt: new Date("2026-06-26T12:00:00Z"),
    };

    expect(canAccessInsider(user)).toBe(true);
    expect(canAccessEditor(user)).toBe(true);
    expect(() => requireEditor(user)).not.toThrow();
  });
});
