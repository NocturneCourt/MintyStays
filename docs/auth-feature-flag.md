# Auth Feature Flag

`AUTH_ENABLED` controls whether member and editor account flows are reachable.
The default is false.

## False State

With `AUTH_ENABLED=false`:

- Public map, filters, detail pages, affiliate redirects, and anonymous disputes
  stay available.
- `/api/auth/*`, `/api/insider/reports`, and `/api/editor/listings/:id` return
  404.
- Public pages do not render sign-in, Insider report, or Editor edit controls.
- Seeded editorial fields still render publicly.

## True State

Before flipping to `AUTH_ENABLED=true`, verify these variables are set:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_SITE_URL`
- `EMAIL_FROM`
- `EMAIL_PROVIDER_API_KEY`

Then run:

```sh
AUTH_ENABLED=true DATABASE_URL="$DATABASE_URL" pnpm test:e2e -- auth-enabled-flows
```

Expected behavior:

- `/api/auth/signin` is reachable.
- Anonymous requests to Insider routes return 401, not 404.
- Anonymous requests to Editor routes return 403, not 404.
- Public pages show a sign-in entry point.
- Signed-in Insider Members can submit attributable reports.
- Signed-in Editors can open `/admin/listings/:id` and update Handpicked,
  Editor Verified, and Editor Score without changing Guest Signal.

## Rollback

1. Set `AUTH_ENABLED=false`.
2. Redeploy or restart the Railway service.
3. Confirm `/api/auth/session` returns 404.
4. Confirm public launch smoke tests still pass.
