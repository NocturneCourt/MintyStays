# MintyStays Prelaunch Checklist

Use this before the Nocturne Court GitHub/Railway push.

For the dated launch gate, see `docs/thursday-launch-plan.md`.

## Local Product QA

- Open `/` on desktop and mobile widths.
- Verify the first viewport is map-first and shows the launch city.
- Filter by Guest Signal, stay type, and trust tier.
- Open each seeded listing detail page.
- Confirm Guest Signal and Editor Score are separate rows everywhere.
- Confirm Handpicked and Editor Verified appear as different badges.
- Submit one anonymous dispute and verify duplicate prevention.
- Open an affiliate link and verify the tracked redirect.

## Data QA

- Seed from `src/db/seed/minty-launch-city.json`.
- Use `docs/research-intake.md` when converting public review research into
  seed rows.
- Run `pnpm seed:validate -- --strict` before importing launch data.
- Test CSV shape with `src/db/seed/manual-import-template.csv` when using a
  spreadsheet workflow.
- Confirm each public listing has evidence text or editorial status.
- Confirm no core code imports `ScraperAdapter` directly.
- Re-run scoring after extraction or contribution changes.

## Release QA

- Keep `AUTH_ENABLED=false` for public launch.
- Run `pnpm prelaunch:check` before pushing or deploying.
- Run `pnpm env:check` after setting Railway variables.
- Run `pnpm typecheck`, `pnpm lint`, `pnpm test`, `pnpm build`, and
  `CI=1 pnpm test:e2e`.
- Run migrations and seed against a disposable PostgreSQL database.
- Check `docs/launch-runbook.md` for Railway variables and rollback steps.
- Check `docs/auth-feature-flag.md` before exposing sign-in.
