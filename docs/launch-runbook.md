# MintyStays Launch Runbook

This runbook covers the day-one public deploy for `mintystays.com` with
`AUTH_ENABLED=false`.

## Required Railway Variables

- `DATABASE_URL`: Railway PostgreSQL connection string.
- `AUTH_ENABLED=false`: public launch default.
- `LAUNCH_CITY_SLUG=lisbon`: active MVP city.
- `MAP_STYLE_URL`: optional MapLibre style URL. Defaults to OpenFreeMap
  Positron when unset.
- `MAP_STYLE_URL_DARK`: optional Night Frost MapLibre style URL. Defaults to
  OpenFreeMap Dark when unset.
- `AFFILIATE_DEFAULT_PROVIDER`: `generic` or `booking`.
- `AFFILIATE_BOOKING_PARTNER_ID`: partner ID when Booking.com links are used.
- `NEXT_PUBLIC_SITE_URL=https://mintystays.com`: canonical public URL.
- `NEXTAUTH_URL=https://mintystays.com`: canonical Auth.js callback origin.
- `AUTH_SECRET`: set before enabling auth, even while auth is hidden.
- `EMAIL_FROM` and `EMAIL_PROVIDER_API_KEY`: required before auth flag flip.
- `ANTHROPIC_API_KEY`: required for extraction jobs.
- `TRUSTED_PROXY_HEADERS=false`: keep disabled until the ingress is verified to
  overwrite client-supplied `X-Real-IP` and `X-Forwarded-For`. With this disabled,
  anonymous duplicate protection uses the session cookie; IP throttling requires
  a verified proxy. Test spoofed headers before enabling it.

## First Deploy

1. Provision a Railway PostgreSQL database.
2. Set the variables above in Railway.
3. Configure and verify the service settings before deploying from GitHub:
   build `pnpm build`, start `pnpm start`, pre-deploy
   `pnpm env:check && pnpm db:migrate`, health path `/api/health`, and a
   300-second pre-deploy timeout. `docs/railway-service-settings.json` records
   the intended settings for reference; apply them explicitly to the service.
   Confirm migration logs, not just deployment status.
4. For a manual migration inside Railway's private network:

   ```sh
   DATABASE_URL="$DATABASE_URL" pnpm db:migrate
   ```

5. Initialize a new database through ManualImportAdapter inside the service:

   ```sh
   DATABASE_URL="$DATABASE_URL" LAUNCH_CITY_SLUG=lisbon pnpm db:seed
   pnpm signals:recompute
   ```

   If SSH access is unavailable, append `&& pnpm db:seed && pnpm
   signals:recompute` to the pre-deploy command for the initial deployment only.
   Restore the migration-only command after confirming all six listings were
   imported. Do not keep automatic reseeding enabled on subsequent releases.

6. Open `https://mintystays.com` and verify the Lisbon map, listing cards,
   detail pages, anonymous report form, and affiliate redirects.

Use the deployed service's actual HTTPS origin for `NEXT_PUBLIC_SITE_URL` and
`NEXTAUTH_URL` until the custom domain is connected. Never use the local fallback
dataset as production storage.

The October 3 rollout detected the legacy `railway.json` but its deployment
manifest cleared the release command and health settings, including values saved
explicitly on the service. The root configuration file was removed so service
settings control deployment. The reference JSON in `docs/` is not an automatic
configuration source. Any future infrastructure-as-code migration must preserve
the release command; the CLI migration preview left it as a comment.

## Score Refresh and Recovery

After a scoring correction, or a failed extraction job that already saved its
classifications, refresh stored scores without importing or extracting again:

```sh
DATABASE_URL="$DATABASE_URL" LAUNCH_CITY_SLUG=lisbon pnpm signals:recompute
```

Each listing refresh is transactional and preserves editorial fields. The command
is safe to rerun if interrupted. The October 3, 2026 correction limits text-based
broken-AC penalties to negative signals, as specified in the implementation plan.
Existing databases need this refresh after deploying the correction.

## Deployed Smoke Check

```sh
PLAYWRIGHT_BASE_URL=https://mintystays.com pnpm test:e2e
```

An external base URL selects the read-only deployed suite. It discovers database
listing IDs and verifies health, public pages, detail metadata, and mobile layout.
The local suite exercises writes against disposable data only.

## Local Railway-Like Verification

Use a disposable Postgres instance before touching production data:

```sh
docker run --name mintystays-postgres \
  -e POSTGRES_PASSWORD=mintystays \
  -e POSTGRES_DB=mintystays \
  -p 54329:5432 \
  -d postgres:16

export DATABASE_URL="postgres://postgres:mintystays@127.0.0.1:54329/mintystays"
pnpm db:migrate
pnpm db:seed
pnpm test:postgres
pnpm test:e2e
docker rm -f mintystays-postgres
```

`pnpm test:postgres` is a disposable-database smoke test. It verifies a real
PostgreSQL read, contribution transaction, and rollback, and must not be run
against production.

## Public Auth-Off Checks

With `AUTH_ENABLED=false`:

- `/`, listing detail pages, filters, anonymous disputes, and affiliate exits
  must work.
- `/api/auth/session`, Insider report routes, and Editor update routes must
  return 404.
- No public navigation should expose login, Insider, or Editor controls.
- Seeded Handpicked and Editor Verified badges may appear publicly because
  ManualImportAdapter supports editorial fields while auth is off.
- Anonymous disputes set a review flag. The authenticated editor queue is at
  `/admin/reviews`; until auth is enabled, operators can run
  `DATABASE_URL="$DATABASE_URL" pnpm db:review-queue` to monitor the flag.

## Rollback

If deploy smoke checks fail:

1. Roll back to the previous Railway deployment.
2. Leave `AUTH_ENABLED=false`.
3. Do not rerun seed against production as a rollback step. If a reseed is
   needed, verify the database backup and the live editorial/moderation state
   first.
4. Confirm affiliate redirects still resolve before re-opening traffic.
