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
seconds on a typical broadband connection; map data loads are scoped to the
current bounding box via the `(city_id, lat)` and `(city_id, lng)` btrees rather
than loading the whole city; filter updates feel immediate for MVP listing
volume; scoring jobs can rerun for the launch city on demand

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
- **Make Guest Signal Transparent**: PARTIAL. Formula is unit-testable but
  recency currently keys off extraction time, has no seasonality, and exposes no
  confidence. Tracked by FR-008/008a. Must reach PASS before launch.
- **Keep Sources Separately Auditable**: PASS. ReviewSignal, UserContribution,
  and editorial fields retain source and attribution.
- **Show No Empty Pins**: PASS. Public listing queries require evidence or
  editorial status.
- **Ship One City End-to-End First**: PASS. City is configurable, but all MVP
  flows target one active launch city.
- **Guard Score Separation Structurally**: PARTIAL. No blended column exists, but
  no constraint or test enforces it and conflict UX is undesigned. Tracked by
  FR-027 and Law VIII.

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
|   |   +-- runExtraction.ts
|   +-- scoring/
|   |   +-- guestSignalFormula.ts
|   |   +-- trustTier.ts
|   |   +-- recomputeListingSignals.ts
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
2. Listing query returns active listings in the current map bounding box that
   have cooling evidence or editorial status, using the `(city_id, lat)` and
   `(city_id, lng)` btrees. Upgrade to PostGIS `geography` + GiST and server-side
   clustering on the second city or when a city exceeds ~2k listings.
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
  reviewExcerpts?: Array<{ text: string; authoredAt?: string }>;
};

interface ListingSourceAdapter {
  readonly sourceName: string;
  importCity(input: { citySlug: string; path?: string }): Promise<SeedListing[]>;
}
```

- **ManualImportAdapter**: Reads CSV or JSON seed files and supports editorial
  fields while auth is off. This is the launch path. Each review excerpt carries
  an optional authored date that maps to `raw_reviews.authored_at`; excerpts
  without one are stored with `authored_at` null and excluded from recency and
  seasonality weighting.
- **ScraperAdapter**: Stub implementation behind the same interface. It cannot
  be imported by core scoring, UI, or route logic. Booking.com and Airbnb
  scraping are not architectural dependencies because of ToS and anti-bot risk.
- Future official affiliate, partner, licensed, or internal data sources plug in
  by implementing ListingSourceAdapter.

### Extraction Pipeline

Raw review data and derived cooling classifications live in separate layers so
scoring can re-run cheaply and extraction can re-run safely.

1. Manual or adapter seed writes immutable rows to `raw_reviews` (one per review
   or report) with `content_hash`, `authored_at`, source, and paraphrased
   `raw_text`. Re-seeding the same text is a no-op via
   `UNIQUE (listing_id, content_hash)`.
2. Keyword pre-filter: text without cooling vocabulary
   (`/\b(a\/?c|air[- ]?con|cooling|cold|hot|stuffy|stifling|fan|sweat|temperature)\b/i`)
   is recorded as `mentions_cooling=false` and never sent to the LLM.
3. Cache check: if a `cooling_extractions` row exists for this `content_hash` at
   the current `extraction_version`, reuse it and skip the LLM.
4. Surviving excerpts are batched and sent to Claude (`claude-sonnet-4-6`,
   temperature 0). Prompt requires JSON only:
   `{ "mentions_cooling": boolean, "sentiment": "positive" | "negative" | "neutral", "ac_type_hint": "split" | "central" | "portable" | "none" | null, "confidence": number }`
5. Parser strips code fences, parses JSON safely, and validates with a strict
   schema. On schema failure, one repair retry ("return ONLY the JSON object")
   is made; still-failing rows go to a quarantine queue (never silently dropped).
6. Valid results are written to `cooling_extractions`. Rows with
   `mentions_cooling=true` project into the `review_signals` derived layer used
   by scoring.
7. Re-extraction is triggered by bumping `extraction_version` (model or prompt
   change). `raw_reviews` is never re-fetched, and re-scoring never re-invokes
   the LLM.
8. Broken or non-working AC mentions are detected for scoring from explicit
   anonymous `broken` votes and deterministic phrase detection in negative
   `raw_text`. The Claude JSON contract stays minimal.

Cache key: `sha256(normalized_text)`. Invalidation: only on `extraction_version`
bump, never on re-score. Quarantined rows retain raw output for manual review.

### Guest Signal Formula

Guest Signal uses scraped, anonymous, and Insider signals only. Editorial
verification sets Editor Score and never enters Guest Signal. Each signal carries
an AUTHORED date (when the review or report was written), a source, and a
sentiment. Recency, seasonality, and the broken window are measured from the
authored date, never from extraction time.

Definitions:

- `coolingMentionCount`: count of non-editorial cooling mentions for the listing.
- If `coolingMentionCount < 3`, set `guest_signal_score = null` and
  `guest_signal_status = "unverified"`.
- Source weights: scraped review `1.0`, anonymous contribution `1.25`, Insider
  report `2.5`.
- `ageDays = now - authoredAt`.
- Recency weight `R = 0.5 ^ (ageDays / 540)` (smooth ~18-month half-life,
  replacing the previous bucketed cliffs).
- Seasonality weight `S = coolingSeasonWeight(month(authoredAt), hemisphere)`.
  Northern hemisphere: Jun-Sep `1.0`, May/Oct `0.7`, Apr/Nov `0.4`, Dec-Mar
  `0.2`. Hemisphere is northern when `city.lat >= 0` (the equator uses the
  northern table) and southern when `city.lat < 0`. The southern hemisphere
  applies the northern table to `((month - 1 + 6) mod 12) + 1`, i.e. Dec-Mar
  `1.0`, Nov/Apr `0.7`, Oct/May `0.4`, Jun-Sep `0.2`.
- Per-signal weight `w = sourceWeight * R * S`.
- `weightedPositive = sum(w)` over positive cooling mentions.
- `n_eff = sum(w)` over positive, negative, and neutral cooling mentions
  (effective sample size).
- Bayesian prior: prior ratio `m = 0.55`, prior strength `k = 8`.
- `pHat = (weightedPositive + m * k) / (n_eff + k)`.
- Effective-sample floor: if `n_eff < 1`, set `guest_signal_score = null` and
  `guest_signal_status = "unverified"`. The 3-mention floor is on raw count; this
  floor is on effective sample, so a few very old or off-season mentions cannot
  publish a number. All terms below assume `n_eff >= 1`.
- Confidence via the Wilson score interval half-width on `n_eff` (z = 1.0 for a
  ~68% band):
  - `denom = 1 + z^2 / n_eff`
  - `half = (z / denom) * sqrt(pHat * (1 - pHat) / n_eff + z^2 / (4 * n_eff^2))`
  - `bandWidth = round(100 * 2 * half)`
  - `confidence = bandWidth <= 12 ? "high" : bandWidth <= 25 ? "moderate" : "low"`
- `score = round(100 * pHat)` is the displayed point estimate; the Wilson band is
  used only to derive the high/moderate/low label, not a displayed interval. The
  Bayesian prior plus the confidence band replace the previous `sampleMultiplier`,
  which double-counted small-sample shrinkage.
- Broken penalty (soft, recency- and season-weighted, replacing the flat 35
  cliff):
  - `brokenWeight = sum(w) = sum(sourceWeight * R * S)` over broken mentions
    authored within 365 days.
  - `penalty = min(40, 10 * brokenWeight)`.
  - Broken mentions are also counted as negatives inside `n_eff`; this soft
    penalty applies on top of that, and the double effect is intentional.
- `guestSignal = clamp(score - penalty, 0, 100)`.
- Set `guest_signal_status = "scored"` when a numeric score exists, and surface
  `coolingMentionCount` and `confidence` alongside the number.

The formula and its confidence band must be documented in product-facing copy and
unit tests. Re-scoring runs against stored cooling classifications without
re-extraction. Any formula change requires recomputation for affected listings.

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

### Guest/Editor Conflict Rule

Guest Signal and Editor Score are never blended, but the UI must reconcile them
when they disagree. Map each to a 0-100 cooling reference:

- Editor Score reference: `verified_cold` 85, `verified_adequate` 65,
  `verified_weak` 40, `verified_broken` 15.
- A conflict exists when both values are present and
  `abs(guestSignalScore - editorReference) >= 35`.

On conflict, set a derived `signalsConflict` flag (a boolean for filtering and
telemetry, never a stored blended score), show both scores unchanged, and render
a reconciliation explanation that gives the direct human check (Editor Verified)
narrative precedence for worst-case summer heat. FR-027 references this rule.

## Drizzle Schema Plan

### Enums

- `listing_type`: `hotel`, `str`
- `ac_type`: `split`, `central`, `portable`, `none`
- `guest_signal_status`: `unverified`, `scored`
- `trust_tier`: `unverified`, `scored`, `handpicked`, `editor_verified`
- `listing_status`: `active`, `disputed`
- `review_source`: `scraped`, `insider`, `anonymous`, `editorial`. `scraped` is a
  legacy label that for the lawful launch denotes imported review text (manual
  research or a permitted API such as Google Places), not live scraping; a
  provenance-neutral rename is a tracked follow-up.
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
  `guest_signal_status`, `guest_signal_confidence`, `editor_score`,
  `is_handpicked`, `editor_verified_at`, `trust_tier`, `evidence_summary`,
  `image_url`, `image_attribution`, `photo_gallery`, `review_count_analyzed`,
  `last_seeded_at`, `status`, timestamps.
- `raw_reviews` (immutable raw layer): `id`, `listing_id`, `source`,
  `source_url`, `content_hash`, `raw_text` (paraphrased, never verbatim
  third-party text), `authored_at` (date), `collected_at`.
  `UNIQUE (listing_id, content_hash)`.
- `cooling_extractions` (cache layer): `raw_review_id`, `extraction_version`,
  `mentions_cooling`, `cooling_sentiment`, `ac_type_hint`, `confidence`, `model`,
  `extracted_at`. Primary key `(raw_review_id, extraction_version)`.
- `review_signals` (derived layer over `raw_reviews` joined to
  `cooling_extractions` where `mentions_cooling=true`): `id`, `listing_id`,
  `source`, `raw_excerpt`, `cooling_sentiment`, `ac_type_hint`, `authored_at`,
  `extracted_at`. The prior stored `weight` column is dropped; scoring recomputes
  weights from source, recency, and seasonality.
- `user_contributions`: `id`, `listing_id`, `contributor_type`, `user_id`,
  `session_id`, `vote`, `comment`, `created_at`.
- `users`: `id`, `email`, `role`, `created_at`, `verified_at`.
- `click_events`: `id`, `listing_id`, `session_id`, `user_id`, `created_at`.
- Auth support tables required by Auth.js Email provider and Drizzle adapter,
  kept behind `AUTH_ENABLED` for public routes.

Indexes:

- `cities.slug`, `cities.is_active`
- `listings.city_id`, `listings.status`, `listings.type`, `listings.trust_tier`,
  `listings.guest_signal_score`, plus bounding-box btrees `(city_id, lat)` and
  `(city_id, lng)` for the map hot path
- `raw_reviews.listing_id`, `raw_reviews.content_hash`,
  `review_signals.listing_id`, `review_signals.source`,
  `review_signals.authored_at`
- `user_contributions.listing_id`, `user_contributions.session_id`,
  `user_contributions.user_id`
- `click_events.listing_id`, `click_events.created_at`

Constraints (enforced as database CHECK constraints; the initial migration
omitted these and a follow-up migration must add them):

- `CHECK (guest_signal_score IS NULL OR guest_signal_score BETWEEN 0 AND 100)`.
- `CHECK ((guest_signal_status = 'scored') = (guest_signal_score IS NOT NULL))`.
- `CHECK (editor_score IS NULL OR editor_verified_at IS NOT NULL)`.
- `CHECK ((contributor_type='anonymous' AND session_id IS NOT NULL AND user_id IS NULL)
  OR (contributor_type='insider' AND user_id IS NOT NULL))`.
- Public listing query requires evidence summary, review signal, Handpicked, or
  Editor Verified status (enforced in the query and an architecture test, not a
  row-level constraint).
- No blended Guest/Editor column may exist; a guard test fails if an
  overall/blended/combined/merged cooling-score field appears (Law VIII).

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

## UX and Design System

The visual contract lives in `specs/001-minty-stays/design.md` and supersedes the
current CSS where they differ. What the plan commits to:

- **Cold Index scale**: one shared thermal scale (glacier-blue cold to red hot)
  applied to each score independently via `coldIndex(score)` and
  `coldIndexForEditorScore(...)`. These are the only score-to-color functions and
  never take both scores, preserving the no-blend law structurally.
- **Dual Cold Gauge**: Guest Signal and Editor Score render as two visually
  distinct gauges sharing the scale, never merged; confidence is shown visually.
- **Themes**: light "Daybreak Frost" and dark "Night Frost" via CSS variables on
  `[data-theme]`, defaulting to `prefers-color-scheme` with a manual toggle.
- **Typography**: Fraunces (display) + Inter (body) + IBM Plex Mono (numerals)
  loaded through `next/font`, replacing raw Georgia.
- **Photography**: `image_url` + `image_attribution` + `photo_gallery` on
  listings; a branded thermal placeholder renders when no licensed image exists,
  so no unlicensed imagery is ever fetched.
- **Map**: branded frost (light) and night (dark) MapLibre styles via
  `MAP_STYLE_URL` / `MAP_STYLE_URL_DARK`, band-colored pins encoding one labeled
  score, hollow markers for unrated listings, low-zoom clustering.
- **Conflict**: the Guest/Editor Conflict Rule surfaces a reconciliation panel
  between the two gauges (never a merge).
- **Mobile**: map with a draggable bottom-sheet list; filters in a sheet.
- **Quality bar**: WCAG AA on all band tints in both themes, color never the sole
  encoder of a score, `prefers-reduced-motion` respected, Lighthouse >= 90.

New dependencies: `next/font` families (Fraunces, Inter, IBM Plex Mono). No new
runtime libraries are required for theming, gauges, or pins (CSS plus existing
MapLibre).

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
- `MAP_STYLE_URL_DARK`
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
