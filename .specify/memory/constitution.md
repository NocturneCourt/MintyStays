<!--
Sync Impact Report
Version change: 1.0.0 -> 1.1.0
Reason: Design review (2026-06-28) found the Guest Signal recency basis,
seasonality, confidence exposure, score-separation guard, and conflict handling
underspecified. This amendment strengthens Law IV and adds Law VIII.
Modified principles: IV. Make Guest Signal Transparent (authored-date recency,
seasonality, confidence indicator)
Added sections: VIII. Guard Score Separation Structurally
Removed sections: None
Templates reviewed: .specify/templates/spec-template.md, .specify/templates/plan-template.md, .specify/templates/tasks-template.md
Follow-up TODOs: spec.md FR-008/008a/008b/027/028, plan.md formula + extraction +
schema + conflict-rule blocks, tasks.md T006a/T006b/T009a/T015a/T016a/T022a/T034a/
T036a/T037a/T041a plus reworked extraction tasks T048-T050 and T049a, and the
required public-documentation update (src/app/(public)/guest-signal/page.tsx) and
seed authored-date fixtures
-->

# MintyStays Constitution

## Core Principles

### I. Separate Guest Signal and Editor Score

Guest Signal and Editor Score MUST remain independent in data, scoring,
filtering, and UI. No screen, badge, sort, export, API response, or analytics
rollup may silently blend them into one displayed number. Guest Signal is the
machine-auditable layer derived from review data and qualifying human
contributions. Editor Score is the trusted human layer. Each listing card and
detail view MUST label them separately whenever either value exists.

### II. Preserve Trust Tier Semantics

Handpicked and Editor Verified MUST stay semantically distinct in both data and
UI. Handpicked is a curation or taste signal: the team selected the listing as a
strong candidate. Editor Verified is an evidence claim: a trusted human directly
confirmed cooling performance and set the Editor Score. They MUST NOT be
presented as interchangeable trust levels, collapsed into the same badge, or
stored only as a shared generic editorial flag.

### III. Keep Seeding Sources Swappable

Listing and review seeding MUST go through a ListingSourceAdapter boundary. Core
listing, extraction, scoring, UI, and affiliate logic MUST NOT import a scraper
implementation directly. Manual import MUST be a first-class adapter so the
product can launch and operate without any scraping dependency. ScraperAdapter
is a replaceable implementation only, and the architecture MUST allow official
affiliate, partner, licensed data, or manual sources to replace it with minimal
change.

### IV. Make Guest Signal Transparent

The Guest Signal formula MUST be documented, deterministic, and auditable. A
listing with fewer than three cooling mentions MUST show no numeric Guest Signal
and MUST use the status "Unverified". The formula MUST include recency weighting,
a trailing-12-month penalty for broken or non-working AC mentions, and a
low-sample-size discount. Recency and the trailing-12-month broken window MUST be
measured from the date a review was AUTHORED, never from extraction time. The
formula MUST account for review seasonality so off-season cooling reviews do not
carry summer-equivalent weight. Every displayed numeric Guest Signal MUST also
expose a confidence indicator derived from effective sample size. Any change to
the formula requires a constitution compliance review and a migration or
recomputation plan.

### V. Keep Sources Separately Auditable

Scraped review signals, anonymous contributions, Insider Member reports, and
editorial verification MUST remain distinguishable after ingestion. The system
MUST retain source, weight, timestamp, and evidence context for every signal used
to affect Guest Signal or Editor Score. Anonymous and Insider contributions may
influence Guest Signal with different weights, but they MUST remain separately
queryable and explainable.

### VI. Show No Empty Pins

Every public listing pin or card MUST have at least one cooling evidence summary,
one cooling signal, Handpicked status, or Editor Verified status. The map MUST
NOT show empty inventory merely because a hotel or rental exists. MintyStays is
an "actually cold" signal product, not a general accommodation directory.

### VII. Ship One City End-to-End First

The MVP MUST launch one active city end-to-end before generalizing to many
cities. Multi-city abstractions are allowed only when they directly support the
launch city without delaying it. City configuration MUST exist from day one, but
the first release is judged by whether one city works completely: seeding,
scoring, map browsing, evidence, affiliate links, anonymous disputes, and seeded
editorial content.

### VIII. Guard Score Separation Structurally

No persisted column, API field, or DTO may represent a blended Guest Signal and
Editor Score value. An automated test MUST fail if a field matching overall,
blended, combined, or merged cooling score appears in the schema or any public
response. When Guest Signal and Editor Score conflict, the product MUST display
both, MUST NOT average them, and MUST show a reconciliation explanation that
gives the direct human check narrative precedence for worst-case heat.

## Product Boundaries

MintyStays is a map-first web product for hotels and short-term rentals with
credible cooling evidence. The launch product MUST support:

- A configurable launch city and an expandable City model.
- Hotels and short-term rentals as separate listing types.
- Map pins with a side list and filters for Guest Signal score, listing type,
  and trust tier.
- Listing detail views with Guest Signal, Editor Score, AC type when known,
  cooling evidence, trust badges, and affiliate booking links.
- Anonymous confirm or dispute input identified by session cookie.
- Insider Member and Editor schemas and logic, even when public auth is disabled.
- Editorial fields seedable by ManualImportAdapter while auth is off.
- Public deployment with `AUTH_ENABLED=false` where map, filters, evidence,
  affiliate links, and anonymous disputes work without login.

## Development Workflow

Implementation MUST start with schema and ManualImportAdapter so the public app
can operate before any scraper exists. The map-first public experience and
two-score UI MUST be delivered before auth-dependent workflows. Auth and roles
MUST be built with passwordless member access, but login exposure MUST remain
feature-flagged. Extraction and scoring MUST be modular enough to rerun imported
signals and explain score changes. Affiliate click tracking MUST be present from
day one because it affects schema and product economics.

Each feature slice MUST be independently verifiable. Verification MUST include
the constitution laws most likely to regress: no blended score, distinct
Handpicked and Editor Verified semantics, no direct scraper imports in core
logic, transparent score calculation, source auditability, no empty pins, and
one-city completion before multi-city expansion.

## Governance

This constitution supersedes convenience, visual preference, and implementation
shortcuts. Any spec, plan, task, code change, seed format, admin tool, or UI copy
that conflicts with these laws is blocked until the constitution is amended.

Amendments require:

- A written reason for the change.
- A version bump using semantic versioning.
- Updates to affected specs, plans, tasks, tests, seed data, and public
  documentation.
- Explicit review of the two-score model and trust-tier semantics when either
  area is touched.

Versioning rules:

- MAJOR for changes that redefine or remove a law.
- MINOR for new laws or materially expanded governance.
- PATCH for wording clarifications that do not change behavior.

Compliance review is required before implementation begins for any feature that
touches scoring, trust badges, signal ingestion, auth, editorial tools,
affiliate tracking, or public listing display.

**Version**: 1.1.0 | **Ratified**: 2026-06-26 | **Last Amended**: 2026-06-28
