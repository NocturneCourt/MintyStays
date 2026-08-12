# Grok Codebase Audit Report
**MintyStays** | **Date**: 2026-07-28 | **Run**: Grok v0.2.112
**Scope**: `src/`, `tests/`, `specs/`, constitution compliance, launch readiness

---

## Executive Summary

Core trust model (two scores, adapter boundary, seed path) is **deliberately designed and mostly enforced**. Launch risk is concentrated in:
1. **Abuseable dispute handling** — one anonymous dispute hides listing; sessions are free
2. **Thin launch data** — 6 listings, 0 Guest Signals, 0 trust tiers
3. **Silent DB fallbacks** — production can serve seed IDs when Postgres fails, masking outages
4. **Ops-unsafe reseed** — `db:seed` always inserts; re-run duplicates inventory

**Overall verdict**: Ship-blocking issues exist. Fix before launch. Constitution is sound; product execution needs hardening.

---

## Critical Findings (Fix First)

| Priority | Issue | Severity | Impact |
|---|---|---|---|
| **1** | One anonymous dispute marks listing `disputed` and removes it from public map; sessions are free/unsigned | **CRITICAL** | Attacker can empty the map in minutes |
| **2** | Launch seed: 6 listings, **0 Guest Signals**, **0 Handpicked**, **0 Editor Verified** | **HIGH** | Product barely demos the dual-score design; board looks broken |
| **3** | Anonymous contributions never recompute Guest Signal (Insider path does) | **HIGH** | Contradicts formula page and constitution Law IV |
| **4** | Silent seed fallback when DB fails masks production outages | **HIGH** | Wrong inventory/IDs can be served without 5xx |
| **5** | `db:seed` always inserts; re-run duplicates inventory | **HIGH** | Ops footgun during launch firefighting |
| **6** | Affiliate redirect trusts arbitrary `affiliateUrl` (open redirect) | **HIGH** | Compromised seed → phishing redirect |
| **7** | No rate limits, security headers, or DB health probe | **MEDIUM–HIGH** | Low-hanging abuse surface |

---

## High-Impact Issues by Category

### Architecture
- **Asymmetric contribution pipeline**: Insider reports recompute Guest Signal; anonymous does not. Same UI, different invariants.
- **Silent multi-path data plane**: Pages fall back to in-process seed when `DATABASE_URL` missing/fails. Prod can serve seed IDs while APIs expect UUIDs, or hide DB failures.
- **BBox filtering underutilized**: Server-side filtering exists; UI never drives it (form GET only, fixed bounds).

### Code Quality
- **Dispute is product-nuclear**: First weak/broken vote sets `status: "disputed"` with no moderation, threshold, or restore path.
- **Non-idempotent import**: City upserts; listings always `insert` → reseed clones rows.
- **Regex sentiment weak**: `inferCoolingSentiment` on seed import is brittle; affects scores without extraction.

### Security (7 findings)
1. **CRITICAL**: Unauthenticated inventory wipe via dispute (see above).
2. **HIGH**: Open redirect via affiliate URL (no allowlist).
3. **HIGH**: No security headers (CSP, HSTS, X-Frame-Options).
4. **MEDIUM**: Health doesn't probe DB (env-only "ok").
5. **MEDIUM**: Unsigned session IDs (client-forgable).
6. **MEDIUM**: No unique constraint on insider `(listing_id, user_id)`.
7. **MEDIUM**: Anonymous session minting is free.

### Data Model
- **No natural key for listings** → reseed duplicates.
- **Seed quality**: 6 listings, 0 with ≥3 cooling mentions, 0 editorial. Barely passes validation.
- **Missing schema fields**: `image_url`, `photo_gallery` not in DB (planned T080).
- **No `pending_review` status** → disputed listings can't be cleared.

### Testing Gaps
- No test that anonymous contribution updates Guest Signal (because the feature is missing).
- No test for dispute → listing disappears / abuse cycles.
- No real Postgres integration suite (all "integration" tests use mocks).
- No open-redirect or affiliate URL allowlist test.

### UI/UX (Against design.md)
- **Photography not shipped** (T080 open, schema lacks `image_url`).
- **All cards "Unverified"** → weak thermal story (design explicitly warns against this).
- **Conflict UI unobservable** (no scored + editor pairs in seed).
- **Filters require full page nav** (design wants instant feedback).
- **WCAG AA not systematically verified** for band tints in both themes.

### Constitution Compliance
| Law | Status | Gap |
|---|---|---|
| I. Separate scores | **PASS** | Dual fields, no blend; test guards it |
| II. Trust tiers | **PASS (code) / FAIL (data)** | No handpicked/verified in seed |
| III. Swappable sources | **PASS** | Adapter interface, `source-boundary` enforced |
| IV. Transparent Guest Signal | **PASS (formula/docs) / PARTIAL (product)** | No scored listings in seed; formula page intact |
| V. Auditable sources | **PARTIAL** | Manual import labeled `scraped` in raw reviews |
| VI. No empty pins | **PASS** | Query + seed validation enforced |
| VII. One city first | **PASS** | `LAUNCH_CITY_SLUG` + Lisbon seed |
| VIII. Guard separation | **PASS** | Conflict notice + test; unobservable at launch |

---

## Recommended Fix Order (Before Launch)

### Tier 1: Launch Blockers
1. **Dispute policy** (CRITICAL): Stop auto-hiding on single dispute. Prefer: write contribution + optional `review_needed` flag; require N sessions or editor review before removing pin; add rate limit (IP + listing).
2. **Wire Guest Signal recompute into anonymous path** (mirror insider path).
3. **Enrich launch seed** with ≥1 scored listing (≥3 dated mentions) and ≥1 Handpicked/Verified pair so conflict and dual gauges are real.
4. **Idempotent seed** (upsert on `(city_id, source, source_url)`).
5. **Fail closed on DB errors**: `NODE_ENV===production` or `DATABASE_URL` set → no silent fallback; health should `SELECT 1`.
6. **Affiliate URL allowlist** (e.g. `booking.com` hosts only) before redirect.

### Tier 2: Ops Hygiene
- Security headers (CSP, HSTS, X-Frame-Options).
- Contribution rate limiting (per IP, per listing, per session).
- Real Postgres integration tests for contribution → score → visibility.

### Tier 3: Post-Launch (OK to defer)
- Photo pipeline (T080).
- Instant client-side filters.
- Multi-city / PostGIS.
- Auth enablement.

---

## Strengths Worth Keeping

- Scoring formula unit tests + formula transparency (public page).
- Constitution guards: `no-blend-guard.test.ts`, `source-boundary`.
- Type safety: schema enums, check constraints, Zod on API bodies.
- Clean separation of concerns: `lib/*` services, adapters, score path.
- Theme + tokens system (Daybreak/Night Frost) mostly landed.
- Drizzle parameterized queries (no raw SQL string concat).

---

## Uncommitted Local State

Working tree has modifications to design, schema, CSS, listing components, contribution service, docs. Verify/commit before deploy.

---

## Test Coverage Snapshot

- **Typecheck**: ✓ `tsc --noEmit` clean
- **Unit tests**: 76/76 pass (scoring, formula, constitution guards)
- **Integration mocks**: ✓ contributions, insider, extraction, seed validation
- **E2E Playwright**: ✓ public smoke, affiliate, contributions form
- **Gap**: Production mutation paths under real DB, dispute abuse cycles, conflict rendering

---

## Bottom Line

The codebase is disciplined about trust-model **structure** (two scores, adapter boundary, transparency). It is **not yet disciplined about trust-model operations** (dispute abuse, score recompute parity, production data-plane honesty).

**Do not soft-launch until:**
- Dispute auto-hide is fixed
- Guest Signal recompute is wired into anonymous path
- Seed is enriched with real signal and trust badges
- Reseed is idempotent
- Silent seed fallback is removed from production

**With fixes in Tier 1, launch is viable and constitution holds.**
