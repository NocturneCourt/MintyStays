# MintyStays Thursday Launch Plan

Target: public soft launch on Thursday, July 2, 2026.

## Launch Position

- Launch as Lisbon-only with `AUTH_ENABLED=false`.
- Use ManualImportAdapter seed data as the source of truth.
- Treat auth, live scraping, automated extraction caching, and multi-city growth
  as post-launch work.
- Public pages must show map, filters, listing detail, separate Guest Signal and
  Editor Score rows, evidence, anonymous reports, and affiliate exits.

## Must Be True Before Launch

- Working tree changes are reviewed, intentionally staged, committed, and pushed.
- The Nocturne Court GitHub repository exists and the local remote points to it.
- Railway deploy is connected to that repository and has a PostgreSQL database.
- Railway variables pass `pnpm env:check` with production values.
- Migrations run cleanly against Railway PostgreSQL.
- `pnpm db:seed` imports the Lisbon launch city without validation failures.
- `https://mintystays.com/api/health` returns healthy after deploy.
- Public smoke checks pass on `https://mintystays.com`.

## Local Gate

Run this before pushing or deploying:

```sh
pnpm prelaunch:check
```

This validates the launch seed, typechecks the app, runs lint, runs Vitest,
builds the production app, and runs the Playwright public launch suite.

## Production Gate

After Railway variables are set:

```sh
pnpm env:check
pnpm db:migrate
pnpm db:seed
```

Then verify:

- `/` loads the Lisbon map and list.
- Filter by score, type, and trust tier.
- Open at least one hotel and one short-term rental detail page.
- Confirm Guest Signal and Editor Score remain separate.
- Confirm Handpicked and Editor Verified badges are visually distinct.
- Submit one anonymous dispute.
- Click one affiliate link and confirm a ClickEvent is recorded.
- Open `/guest-signal`, `/robots.txt`, `/sitemap.xml`, and `/api/health`.

Run the public smoke suite against production:

```sh
PLAYWRIGHT_BASE_URL=https://mintystays.com pnpm test:e2e
```

## Launch Blockers

- GitHub: the Nocturne Court repository or SSH/account configuration must be
  working before Railway can deploy from the intended repo.
- Railway: deployment cannot proceed until Railway auth/token access works and
  the project has a PostgreSQL service.
- Data: the site can launch with the current seed, but adding more Lisbon rows
  improves the first impression. Do not block launch on scraping.

## Recommended Remaining Scope

Before launch:

- Add the Guest-vs-Editor conflict card state and Playwright test.
- Add a few more manually researched Lisbon listings if time allows.
- Run the local gate after every meaningful change.

After launch:

- Split raw reviews and cooling extractions into immutable tables.
- Add extraction cache/retry/quarantine workflow.
- Enable auth when email configuration is ready.
- Grow beyond Lisbon after the first city is stable.
