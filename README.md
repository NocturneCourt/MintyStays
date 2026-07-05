# MintyStays

Map-first discovery for hotels and short-term rentals with credible evidence
that the room actually gets cold.

## Local Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in local values.
3. Check required launch settings with `pnpm env:check`.
4. Validate seed data with `pnpm seed:validate -- --strict`.
5. Generate migrations with `pnpm db:generate`.
6. Run tests with `pnpm test`.
7. Start the app with `pnpm dev`.

Before a public deploy, run the full launch gate:

```sh
pnpm prelaunch:check
```

The Thursday launch plan lives in `docs/thursday-launch-plan.md`.

The public MVP must work with `AUTH_ENABLED=false`. Member and editor schemas
exist from the start, but authenticated flows stay gated until the final flag
wiring task.

## Maps

The app uses MapLibre GL for rendering and OpenFreeMap Positron as the default
basemap style:

```text
https://tiles.openfreemap.org/styles/positron
```

Playwright tests use `public/test-map-style.json` so map tests do not depend on
external tile availability.

## Research Intake

Manual research rows should start from
`src/db/seed/research-intake-template.csv`. Store paraphrased cooling themes,
not copied review text, and validate with
`pnpm seed:validate -- path/to/file.csv --strict`.

## Product Laws

Project laws live in `.specify/memory/constitution.md`. The most important one:
Guest Signal and Editor Score are never blended into one displayed number.
