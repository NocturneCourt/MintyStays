# Research Intake

MintyStays can use public listing pages for manual research, but the seed data
must store paraphrased cooling themes, not copied review text.

## Workflow

1. Start from `src/db/seed/research-intake-template.csv`.
2. Record one row per listing.
3. Use `source_url` for the listing page and `evidence_source_url` for the page
   where cooling evidence was observed.
4. Set `evidence_observed_at` to the research date in `YYYY-MM-DD` format.
5. Convert review language into short cooling themes separated by `|` in
   `review_excerpts`.
6. Set `evidence_is_paraphrased=true` only after copied wording has been
   removed.
7. Run `pnpm seed:validate -- path/to/research.csv --strict`.

## Tool-Assisted Drafts

Firecrawl, Crawl4AI, MarkItDown, or a supervised browser session may be used to
produce local markdown captures. They do not write directly to seed data.

1. Create a capture manifest as described in `docs/source-tooling-decision.md`.
2. Generate a draft CSV:

   ```sh
   pnpm research:draft research/lisbon-captures.json --out src/db/seed/lisbon-research-draft.csv
   ```

3. Rewrite captured snippets into short paraphrased cooling themes.
4. Set `evidence_is_paraphrased=true`.
5. Run strict seed validation before importing.

## Browser Research Rules

- Do not automate bulk review collection.
- Do not bypass CAPTCHAs, login walls, paywalls, rate limits, or browser safety
  prompts.
- Do not store full review text in seed files.
- Do not treat Handpicked as Editor Verified.
- If fewer than three cooling themes exist, the listing can remain Unverified or
  rely on editorial status, but it must still have evidence text before public
  display.
