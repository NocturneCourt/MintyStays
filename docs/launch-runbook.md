# MintyStays Launch Runbook

This runbook covers the day-one public deploy for `mintystays.com` with
`AUTH_ENABLED=false`.

## Required Railway Variables

- `DATABASE_URL`: Railway PostgreSQL connection string.
- `AUTH_ENABLED=false`: public launch default.
- `LAUNCH_CITY_SLUG=lisbon`: active MVP city.
- `MAP_STYLE_URL`: optional MapLibre style URL. Defaults to OpenFreeMap
  Positron when unset.
- `AFFILIATE_DEFAULT_PROVIDER`: `generic` or `booking`.
- `AFFILIATE_BOOKING_PARTNER_ID`: partner ID when Booking.com links are used.
- `NEXT_PUBLIC_SITE_URL=https://mintystays.com`: canonical public URL.
- `AUTH_SECRET`: set before enabling auth, even while auth is hidden.
- `EMAIL_FROM` and `EMAIL_PROVIDER_API_KEY`: required before auth flag flip.
- `ANTHROPIC_API_KEY`: required for extraction jobs.

## First Deploy

1. Provision a Railway PostgreSQL database.
2. Set the variables above in Railway.
3. Deploy the app from the GitHub repository.
4. Run migrations:

   ```sh
   DATABASE_URL="$DATABASE_URL" pnpm db:migrate
   ```

5. Seed the launch city through ManualImportAdapter:

   ```sh
   DATABASE_URL="$DATABASE_URL" LAUNCH_CITY_SLUG=lisbon pnpm db:seed
   ```

6. Open `https://mintystays.com` and verify the Lisbon map, listing cards,
   detail pages, anonymous report form, and affiliate redirects.

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
pnpm test:e2e
docker rm -f mintystays-postgres
```

## Public Auth-Off Checks

With `AUTH_ENABLED=false`:

- `/`, listing detail pages, filters, anonymous disputes, and affiliate exits
  must work.
- `/api/auth/session`, Insider report routes, and Editor update routes must
  return 404.
- No public navigation should expose login, Insider, or Editor controls.
- Seeded Handpicked and Editor Verified badges may appear publicly because
  ManualImportAdapter supports editorial fields while auth is off.

## Rollback

If deploy smoke checks fail:

1. Roll back to the previous Railway deployment.
2. Leave `AUTH_ENABLED=false`.
3. Do not rerun seed against production until the broken deploy is diagnosed.
4. Confirm affiliate redirects still resolve before re-opening traffic.
