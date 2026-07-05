import { describe, expect, it } from "vitest";
import {
  coldIndex,
  coldIndexForEditorScore,
} from "@/lib/design/coldIndex";

describe("coldIndex", () => {
  it("maps score ranges onto the five thermal bands", () => {
    expect(coldIndex(100).band).toBe("glacier");
    expect(coldIndex(85).band).toBe("glacier");
    expect(coldIndex(84).band).toBe("cool");
    expect(coldIndex(70).band).toBe("cool");
    expect(coldIndex(69).band).toBe("temperate");
    expect(coldIndex(55).band).toBe("temperate");
    expect(coldIndex(54).band).toBe("warm");
    expect(coldIndex(40).band).toBe("warm");
    expect(coldIndex(39).band).toBe("hot");
    expect(coldIndex(0).band).toBe("hot");
  });

  it("clamps out-of-range scores instead of leaking bands", () => {
    expect(coldIndex(120).band).toBe("glacier");
    expect(coldIndex(-5).band).toBe("hot");
  });

  it("returns theme-aware CSS variables and a human label", () => {
    const result = coldIndex(90);
    expect(result.solid).toBe("var(--band-glacier)");
    expect(result.soft).toBe("var(--band-glacier-soft)");
    expect(result.label).toBe("Freezing cold");
  });
});

describe("coldIndexForEditorScore", () => {
  it("maps the four editor verdicts onto the shared scale", () => {
    expect(coldIndexForEditorScore("verified_cold").band).toBe("glacier");
    expect(coldIndexForEditorScore("verified_adequate").band).toBe("temperate");
    expect(coldIndexForEditorScore("verified_weak").band).toBe("warm");
    expect(coldIndexForEditorScore("verified_broken").band).toBe("hot");
  });
});

describe("structural no-blend guard", () => {
  it("keeps each color function to exactly one score input", () => {
    expect(coldIndex.length).toBe(1);
    expect(coldIndexForEditorScore.length).toBe(1);
  });
});
