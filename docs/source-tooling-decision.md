# Source Tooling Decision

MintyStays can use crawler and page-conversion tools to speed up research, but
they stay outside the production app boundary.

## Decision

- Use Firecrawl, Crawl4AI, or MarkItDown only to create local research captures.
- Convert captures into draft CSV rows with `pnpm research:draft`.
- Require human review and paraphrasing before any row can pass strict seed
  validation.
- Keep crawler packages out of the Next.js runtime and out of core import,
  scoring, UI, affiliate, and route code.
- Do not use anti-bot, fingerprinting, mobile-app mirroring, or login-wall
  automation for launch sourcing.

## Tool Fit

- **Firecrawl**: useful for JS-rendered public pages that need markdown or
  structured capture.
- **Crawl4AI**: useful for turning public pages into LLM-friendly markdown.
- **MarkItDown**: useful for converting exported PDFs, documents, and research
  packets into markdown.
- **Browser-Use**: only for supervised browser research where a human is
  steering the session.
- **Crawlee, Scrapy, AutoScraper**: later candidates for permitted sources,
  partner APIs, or owned datasets.
- **Scrapling, curl-impersonate, scrcpy**: not part of the launch sourcing path.

## Capture Manifest

Create a JSON manifest that points to captured markdown or includes captured
text directly:

```json
{
  "city": {
    "slug": "lisbon",
    "name": "Lisbon",
    "country": "Portugal",
    "lat": 38.7223,
    "lng": -9.1393
  },
  "observedAt": "2026-07-02",
  "listings": [
    {
      "name": "Example Cold Flat",
      "type": "str",
      "lat": 38.71,
      "lng": -9.14,
      "address": "Example street",
      "source": "firecrawl",
      "sourceUrl": "https://example.com/listing",
      "affiliateBaseUrl": "https://example.com/book",
      "acType": "split",
      "evidenceSourceLabel": "Firecrawl markdown capture",
      "evidenceSourceUrl": "https://example.com/listing",
      "capturePath": "captures/example-cold-flat.md",
      "authoredDates": ["2026-06-20", "2026-06-19"]
    }
  ]
}
```

Then generate a draft:

```sh
pnpm research:draft research/lisbon-captures.json --out src/db/seed/lisbon-research-draft.csv
```

The generated CSV sets `evidence_is_paraphrased=false` on purpose. Before import,
replace captured snippets with short paraphrased cooling themes, rewrite the
evidence summary, set `evidence_is_paraphrased=true`, and run:

```sh
pnpm seed:validate -- src/db/seed/lisbon-research-draft.csv --strict
```

Only strict-passing rows should be merged into `src/db/seed/minty-launch-city.json`.
