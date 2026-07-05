import { describe, expect, it } from "vitest";
import {
  buildResearchDraftCsv,
  extractCoolingCandidates,
} from "@/lib/research/prepareResearchDraft";

describe("research draft preparation", () => {
  it("extracts cooling-related candidate snippets from captured markdown", () => {
    const candidates = extractCoolingCandidates(`
      ## Reviews
      Breakfast was pleasant and the location worked well.
      The A/C made the room cold quickly during a hot afternoon.
      Staff were friendly.
      The fan helped, but the bedroom stayed stuffy at night.
    `);

    expect(candidates).toEqual([
      "The A/C made the room cold quickly during a hot afternoon.",
      "The fan helped, but the bedroom stayed stuffy at night.",
    ]);
  });

  it("creates draft CSV rows that strict seed validation must block until reviewed", async () => {
    const csv = await buildResearchDraftCsv({
      city: {
        slug: "lisbon",
        name: "Lisbon",
        country: "Portugal",
        lat: 38.7223,
        lng: -9.1393,
      },
      observedAt: "2026-07-02",
      listings: [
        {
          name: "Draft Cold Flat",
          type: "str",
          lat: 38.71,
          lng: -9.14,
          source: "firecrawl",
          sourceUrl: "https://example.com/draft-cold-flat",
          captureText:
            "Guests say the air conditioning was powerful. Another review says the room stayed hot.",
          authoredDates: ["2026-06-20", "2026-06-19"],
        },
      ],
    });

    expect(csv).toContain("Draft Cold Flat");
    expect(csv).toContain("evidence_is_paraphrased");
    expect(csv).toContain(",false,false,false,");
    expect(csv).toContain("Guests say the air conditioning was powerful.");
    expect(csv).toContain("Another review says the room stayed hot.");
  });
});
