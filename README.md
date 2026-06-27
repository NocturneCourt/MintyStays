# MintyStays

Map-first discovery for hotels and short-term rentals with credible evidence
that the room actually gets cold.

## Local Setup

1. Install dependencies with `pnpm install`.
2. Copy `.env.example` to `.env` and fill in local values.
3. Generate migrations with `pnpm db:generate`.
4. Run tests with `pnpm test`.
5. Start the app with `pnpm dev`.

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

## Product Laws

Project laws live in `.specify/memory/constitution.md`. The most important one:
Guest Signal and Editor Score are never blended into one displayed number.
