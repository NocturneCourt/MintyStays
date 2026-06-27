import { describe, expect, it } from "vitest";
import {
  ClaudeJsonParseError,
  parseClaudeCoolingJson,
  stripClaudeCodeFence,
} from "@/lib/extraction/parseClaudeJson";

describe("parseClaudeCoolingJson", () => {
  it("parses valid cooling JSON", () => {
    expect(
      parseClaudeCoolingJson(
        '{"mentions_cooling":true,"sentiment":"positive","ac_type_hint":"split","confidence":0.91}',
      ),
    ).toEqual({
      mentions_cooling: true,
      sentiment: "positive",
      ac_type_hint: "split",
      confidence: 0.91,
    });
  });

  it("strips fenced JSON before parsing", () => {
    const raw = [
      "```json",
      '{"mentions_cooling":true,"sentiment":"negative","ac_type_hint":null,"confidence":0.82}',
      "```",
    ].join("\n");

    expect(stripClaudeCodeFence(raw)).toBe(
      '{"mentions_cooling":true,"sentiment":"negative","ac_type_hint":null,"confidence":0.82}',
    );
    expect(parseClaudeCoolingJson(raw)).toMatchObject({
      sentiment: "negative",
      ac_type_hint: null,
    });
  });

  it("rejects invalid JSON", () => {
    expect(() => parseClaudeCoolingJson("not json")).toThrow(ClaudeJsonParseError);
  });

  it("rejects schema mismatches", () => {
    expect(() =>
      parseClaudeCoolingJson(
        '{"mentions_cooling":true,"sentiment":"icy","ac_type_hint":null,"confidence":0.5}',
      ),
    ).toThrow("schema validation");
  });
});
