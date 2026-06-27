import { describe, expect, it } from "vitest";
import { inferCoolingSentiment } from "@/lib/scoring/inferCoolingSentiment";

describe("inferCoolingSentiment", () => {
  it("does not treat hot weather outside as weak room cooling", () => {
    expect(
      inferCoolingSentiment("The room got properly cold after a hot day outside."),
    ).toBe("positive");
  });

  it("detects broken or weak AC as negative", () => {
    expect(inferCoolingSentiment("The AC did not work during our stay.")).toBe(
      "negative",
    );
    expect(inferCoolingSentiment("The room stayed too warm all night.")).toBe(
      "negative",
    );
  });
});
