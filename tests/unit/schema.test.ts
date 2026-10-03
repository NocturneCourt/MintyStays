import { describe, expect, it } from "vitest";
import {
  validateContributionInvariant,
  validateListingInvariant,
} from "@/db/invariants";

describe("schema invariants", () => {
  it("prevents unverified listings from carrying a Guest Signal number", () => {
    expect(() =>
      validateListingInvariant({
        guestSignalStatus: "unverified",
        guestSignalScore: 82,
        guestSignalConfidence: null,
        editorScore: null,
        editorVerifiedAt: null,
        evidenceSummary: "Guests say it cooled quickly.",
        isHandpicked: false,
      }),
    ).toThrow("must not have a Guest Signal number");
  });

  it("requires Editor Score for Editor Verified listings", () => {
    expect(() =>
      validateListingInvariant({
        guestSignalStatus: "unverified",
        guestSignalScore: null,
        guestSignalConfidence: null,
        editorScore: null,
        editorVerifiedAt: new Date("2026-06-26T12:00:00Z"),
        evidenceSummary: "Checked by an editor.",
        isHandpicked: false,
      }),
    ).toThrow("require an Editor Score");
  });

  it("requires an Editor Verified timestamp for Editor Score", () => {
    expect(() =>
      validateListingInvariant({
        guestSignalStatus: "unverified",
        guestSignalScore: null,
        guestSignalConfidence: null,
        editorScore: "verified_cold",
        editorVerifiedAt: null,
        evidenceSummary: "Checked by an editor.",
        isHandpicked: false,
      }),
    ).toThrow("requires an Editor Verified timestamp");
  });

  it("prevents public empty pins without evidence or editorial status", () => {
    expect(() =>
      validateListingInvariant({
        guestSignalStatus: "unverified",
        guestSignalScore: null,
        guestSignalConfidence: null,
        editorScore: null,
        editorVerifiedAt: null,
        evidenceSummary: "",
        isHandpicked: false,
      }),
    ).toThrow("require cooling evidence or editorial status");
  });

  it("requires anonymous sessions and Insider users", () => {
    expect(() =>
      validateContributionInvariant({
        contributorType: "anonymous",
        sessionId: null,
        userId: null,
      }),
    ).toThrow("session id");

    expect(() =>
      validateContributionInvariant({
        contributorType: "insider",
        sessionId: null,
        userId: null,
      }),
    ).toThrow("user id");

    expect(() =>
      validateContributionInvariant({
        contributorType: "insider",
        sessionId: "anonymous-session",
        userId: "user-1",
      }),
    ).toThrow("must not carry an anonymous session id");

    expect(() =>
      validateContributionInvariant({
        contributorType: "anonymous",
        sessionId: "anonymous-session",
        userId: "user-1",
      }),
    ).toThrow("must not carry a user id");
  });
});
