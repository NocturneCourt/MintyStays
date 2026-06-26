# Implementation Plan: MintyStays MVP

**Branch**: `001-minty-stays` | **Date**: 2026-06-26 | **Spec**: `specs/001-minty-stays/spec.md`

**Input**: Feature specification from `specs/001-minty-stays/spec.md`

## Summary

Build a one-city, map-first Next.js web app for discovering hotels and
short-term rentals with credible cooling evidence. The MVP seeds listings
through a swappable ListingSourceAdapter, computes a transparent Guest Signal
from auditable non-editorial signals, displays Editor Score separately, tracks
affiliate clicks, and ships publicly with auth disabled by default while member
and editor schema and logic are present.

## Technical Context

**Language/Version**: TypeScript on current stable Node.js for Next.js

**Primary Dependencies**: Next.js App Router, React, Drizzle ORM, PostgreSQL,
MapLibre GL, Anthropic SDK, Auth.js with Email provider, Railway deployment

**Storage**: PostgreSQL with Drizzle migrations

**Testing**: Vitest for unit tests, Playwright for browser flows, Drizzle
migration checks, focused integration tests for scoring, imports, auth gating,
and click tracking

**Target Platform**: Web app deployed to Railway at `mintystays.com`

**Project Type**: Single Next.js web application with server-side services and
database-backed APIs

**Performance Goals**: Launch-city map loads usable listing data in under 2
seconds on a typical broadband connection; filter updates feel immediate for
MVP listing volume; scoring jobs can rerun for the launch city on demand

**Constraints**: Public site must work with `AUTH_ENABLED=false`; no core logic
may import a scraper; Guest Signal and Editor Score never blend; Handpicked and
Editor Verified remain distinct; one city ships before multi-city rollout

**Scale/Scope**: One launch city, hotels plus short-term rentals, seed import,
public map/list/detail, anonymous contributions, member/editor internals,
affiliate click tracking, and stubs for future source adapters

## Constitution Check

*GATE: Must pass before implementation. Re-check after each scoring, trust, auth,
import, and listing-display change.*

- **Separate Guest Signal and Editor Score**: PASS. The schema, services, UI, and
  tasks keep machine and editorial signals independent.
- **Preserve Trust Tier Semantics**: PASS. Handpicked is stored and displayed as
  curation. Editor Verified requires direct confirmation and Editor Score.
- **Keep Seeding Sources Swappable**: PASS. ListingSourceAdapter is the only
  seeding contract. ManualImportAdapter ships first. ScraperAdapter is a stub.
- **Make Guest Signal Transparent**: PASS. The scoring formula is explicit and
  unit-testable.
- **Keep Sources Separately Auditable**: PASS. ReviewSignal, UserContribution,
  and editorial fields retain source and attribution.
- **Show No Empty Pins**: PASS. Public listing queries require evidence or
  editorial status.
- **Ship One City End-to-End First**: PASS. City is configurable, but all MVP
  flows target one active launch city.

## Project Structure

### Documentation

```text
.specify/memory/constitution.md
specs/001-minty-stays/
+-- spec.md
+-- plan.md
+-- tasks.md
```

### Source Code

```text
src/
+-- app/
|   +-- (public)/
|   |   +-- page.tsx
|   |   +-- listings/[id]/page.tsx
|   +-- api/
|   |   +-- affiliate-click/route.ts
|   |   +-- auth/[...nextauth]/route.ts
|   |   +-- contributions/route.ts
|   |   +-- editor/listings/[id]/route.ts
|   |   +-- insider/reports/route.ts
|   +-- admin/
|       +-- listings/[id]/page.tsx
+-- components/
|   +-- listing/
|   |   +-- ListingCard.tsx
|   |   +-- ListingDetail.tsx
|   |   +-- ScoreRows.tsx
|   |   +-- TrustBadge.tsx
|   +-- map/
|       +-- ListingMap.tsx
|       +-- MapFilters.tsx
+-- db/
|   +-- schema.ts
|   +-- migrations/
|   +-- seed/
+-- lib/
|   +-- affiliate/
|   |   +-- AffiliateLinkBuilder.ts
|   +-- auth/
|   |   +-- authOptions.ts
|   |   +-- featureFlag.ts
|   |   +-- roles.ts
|   +-- contributions/
|   |   +-- contributionService.ts
|   +-- editorial/
|   |   +-- editorialService.ts
|   +-- extraction/
|   |   +-- coolingExtractor.ts
|   |   +-- parseClaudeJson.ts
|   +-- scoring/
|   |   +-- guestSignalFormula.ts
|   |   +-- trustTier.ts
|   +-- sources/
|       +-- ListingSourceAdapter.ts
|       +-- ManualImportAdapter.ts
|       +-- ScraperAdapter.ts
tests/
+-- integration/
+-- unit/
+-- e2e/
```

**Structure Decision**: Use one Next.js App Router project. Server-side services
live under `src/lib`, database schema under `src/db`, route handlers under
`src/app/api`, and reusable UI under `src/components`.

## Architecture

### Public Request Flow

1. Public page loads active launch city by configured slug.
2. Listing query returns active listings that have cooling evidence or editorial
   status.
3. Map and side list receive listing summaries with separate Guest Signal and
   Editor Score fields.
4. Filters apply to listing type, Guest Signal status or minimum score, and
   trust tier.
5. Detail view loads evidence summary, AC type, score rows, trust badge, and
   affiliate action.
6. Affiliate action records ClickEvent before redirecting to the tracked URL.

### Seeding Boundary

Core import code depends only on this contract:

```ts
type SeedListing = {
  citySlug: string;
  name: string;
  type: "hotel" | "str";
  lat: number;
  lng: number;
  address?: string;
  source: string;
  sourceUrl?: string;
  affiliateBaseUrl?: string;
  acType?: "split" | "central" | "portable" | "none";
  evidenceSummary?: string;
  editorial?: {
    handpicked?: boolean;
    editorVerified?: boolean;
    editorScore?: "verified_cold" | "verified_adequate" | "verified_weak" | "verified_broken";
  };
  reviewExcerpts?: string[];
};

interface ListingSourceAdapter {
  readonly sourceName: string;
  importCity(input: { citySlug: string; path?: string }): Promise<SeedListing[]>;
}
```

- **ManualImportAdapter**: Reads CSV or JSON seed files and supports editorial
  fields while auth is off. This is the launch path.
- **ScraperAdapter**: Stub implementation behind the same interface. It cannot
  be imported by core scoring, UI, or route logic. Booking.com and Airbnb
  scraping are not architectural dependencies because of ToS and anti-bot risk.
- Future official affiliate, partner, licensed, or internal data sources plug in
  by implementing ListingSourceAdapter.

### Extraction Pipeline

1. Manual or adapter seed creates listings and raw review excerpts.
2. Extraction job sends each review text to Claude API using model
   `claude-sonnet-4-6`.
3. Prompt requires JSON only:
   `{ "mentions_cooling": boolean, "sentiment": "positive" | "negative" | "neutral", "ac_type_hint": "split" | "central" | "portable" | "none" | null, "confidence": number }`
4. Parser strips code fences, parses JSON safely, validates required keys, and
   drops or quarantines malformed responses.
5. Mentions with `mentions_cooling=false` do not create ReviewSignal rows.
6. ReviewSignal rows retain raw excerpt, source, sentiment, AC hint, weight, and
   extraction timestamp.
7. Broken or non-working AC mentions are detected for scoring from explicit
   anonymous `broken` votes and deterministic phrase detection in negative raw
   excerpts. The Claude JSON contract stays minimal as requested.

### Guest Signal Formula

Guest Signal uses scraped, anonymous, and Insider signals only. Editorial
verification sets Editor Score and never enters Guest Signal.

Definitions:

- `coolingMentionCount`: count of non-editorial cooling mentions for the listing.
- If `coolingMentionCount < 3`, set `guest_signal_score = null` and
  `guest_signal_status = "unverified"`.
- Source weights: scraped review `1.0`, anonymous contribution `1.25`, Insider
  report `2.5`.
- Recency weights by signal age: `1.0` for 0-180 days, `0.85` for 181-365 days,
  `0.6` for 366-730 days, `0.35` for older signals.
- `weightedPositive = sum(sourceWeight * recencyWeight)` for positive cooling
  mentions.
- `weightedTotal = sum(sourceWeight * recencyWeight)` for positive, negative,
  and neutral cooling mentions.
- Bayesian prior: prior ratio `0.55`, prior strength `8`.
- `bayesRatio = (weightedPositive + 0.55 * 8) / (weightedTotal + 8)`.
- `sampleMultiplier = 0.7 + 0.3 * min(1, coolingMentionCount / 12)`.
- `prePenalty = round(100 * bayesRatio * sampleMultiplier)`.
- `brokenPenalty = 35` when any broken or non-working AC mention exists in the
  trailing 12 months, else `0`.
- `guestSignal = clamp(prePenalty - brokenPenalty, 0, 100)`.
- Set `guest_signal_status = "scored"` when a numeric score exists.

The formula must be documented in product-facing copy and unit tests. Any
formula change requires recomputation for affected listings.

### Editor Score and Trust Tier Logic

Editor Score is a nullable editorial label stored separately from Guest Signal.
MVP values:

- `verified_cold`
- `verified_adequate`
- `verified_weak`
- `verified_broken`

Trust data is stored as explicit editorial fields plus a derived public badge:

- `is_handpicked`: editorial curation flag.
- `editor_verified_at` and `editor_score`: direct evidence confirmation.
- `trust_tier`: denormalized public badge for filtering, derived from separate
  fields and Guest Signal status.

Derived badge precedence for a single primary badge:

1. `editor_verified` when Editor Score and verification timestamp exist.
2. `handpicked` when `is_handpicked=true` and no editor verification exists.
3. `scored` when Guest Signal is numeric and no editorial badge takes precedence.
4. `unverified` when no numeric Guest Signal and no editorial badge exists.

The UI may show supplemental labels, but it must not imply Handpicked equals
Editor Verified.

## Drizzle Schema Plan

### Enums

- `listing_type`: `hotel`, `str`
- `ac_type`: `split`, `central`, `portable`, `none`
- `guest_signal_status`: `unverified`, `scored`
- `trust_tier`: `unverified`, `scored`, `handpicked`, `editor_verified`
- `listing_status`: `active`, `disputed`
- `review_source`: `scraped`, `insider`, `anonymous`, `editorial`
- `cooling_sentiment`: `positive`, `negative`, `neutral`
- `contributor_type`: `anonymous`, `insider`
- `contribution_vote`: `confirm_cold`, `dispute_weak`, `broken`
- `user_role`: `insider`, `editor`
- `editor_score`: `verified_cold`, `verified_adequate`, `verified_weak`,
  `verified_broken`

### Tables

- `cities`: `id`, `name`, `country`, `slug`, `lat`, `lng`, `is_active`.
- `listings`: `id`, `name`, `type`, `lat`, `lng`, `city_id`, `address`,
  `source`, `source_url`, `affiliate_url`, `ac_type`, `guest_signal_score`,
  `guest_signal_status`, `editor_score`, `is_handpicked`,
  `editor_verified_at`, `trust_tier`, `evidence_summary`,
  `review_count_analyzed`, `last_seeded_at`, `status`, timestamps.
- `review_signals`: `id`, `listing_id`, `source`, `raw_excerpt`,
  `cooling_sentiment`, `ac_type_hint`, `weight`, `extracted_at`.
- `user_contributions`: `id`, `listing_id`, `contributor_type`, `user_id`,
  `session_id`, `vote`, `comment`, `created_at`.
- `users`: `id`, `email`, `role`, `created_at`, `verified_at`.
- `click_events`: `id`, `listing_id`, `session_id`, `user_id`, `created_at`.
- Auth support tables required by Auth.js Email provider and Drizzle adapter,
  kept behind `AUTH_ENABLED` for public routes.

Indexes:

- `cities.slug`, `cities.is_active`
- `listings.city_id`, `listings.status`, `listings.type`, `listings.trust_tier`,
  `listings.guest_signal_score`
- `review_signals.listing_id`, `review_signals.source`,
  `review_signals.extracted_at`
- `user_contributions.listing_id`, `user_contributions.session_id`,
  `user_contributions.user_id`
- `click_events.listing_id`, `click_events.created_at`

Constraints:

- Guest Signal score nullable unless status is `scored`.
- Guest Signal score within 0-100 when present.
- Editor Score nullable unless editor verification exists.
- Anonymous contributions require `session_id`; Insider contributions require
  `user_id`.
- Public listing query requires evidence summary, review signal, Handpicked, or
  Editor Verified status.

## Auth Approach

Use Auth.js with Email provider for passwordless magic links stored in
PostgreSQL through Drizzle. This is the simplest secure option for the stack:
there are no passwords to store, the flow fits Next.js App Router, it works on
Railway with an email provider such as Resend or Postmark, and role data remains
in the application database.

Roles:

- Anonymous visitor: session-cookie identity only.
- Insider Member: verified email user with `role="insider"`.
- Editor: verified email user with `role="editor"`.

Gating:

- `AUTH_ENABLED` defaults to `false`.
- When false, login links, member routes, editor routes, and authenticated
  server actions return unavailable or not found states.
- When false, public map, cards, detail, filters, affiliate links, and anonymous
  disputes must remain functional.
- User, role, editor, and Insider weighting schema are migrated regardless of
  flag state.
- Editorial fields can be seeded by ManualImportAdapter while auth is off.
- Final task flips and verifies the feature flag wiring.

## Affiliate Links and Click Tracking

AffiliateLinkBuilder constructs tracked URLs from:

- Listing base booking URL.
- Provider configuration.
- Partner ID from environment.
- Optional campaign/source parameters for MintyStays.

Click flow:

1. User clicks booking action.
2. Server records ClickEvent with listing, session, user if present, and time.
3. Server redirects to tracked affiliate URL.

No public booking action appears when a listing lacks a valid affiliate URL.

## Environment Configuration

- `DATABASE_URL`
- `NEXT_PUBLIC_SITE_URL`
- `LAUNCH_CITY_SLUG`
- `AUTH_ENABLED=false`
- `AUTH_SECRET`
- `EMAIL_FROM`
- `EMAIL_PROVIDER_API_KEY`
- `ANTHROPIC_API_KEY`
- `CLAUDE_MODEL=claude-sonnet-4-6`
- `AFFILIATE_BOOKING_PARTNER_ID`
- `AFFILIATE_DEFAULT_PROVIDER`
- `MAP_STYLE_URL`
- `SESSION_COOKIE_NAME`

## Deployment Plan

- Deploy to Railway with PostgreSQL.
- Configure `mintystays.com` and `NEXT_PUBLIC_SITE_URL`.
- Run migrations before first deploy.
- Seed launch city through ManualImportAdapter.
- Verify public deploy with `AUTH_ENABLED=false`.
- Keep auth routes inaccessible until the final feature-flag task is complete.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
