# Tasks: MintyStays MVP

**Input**: Design documents from `specs/001-minty-stays/`

**Prerequisites**: `plan.md`, `spec.md`, `.specify/memory/constitution.md`

**Tests**: Include targeted unit, integration, and browser checks because the
two-score model, source auditability, auth gating, and click tracking are core
product risks.

**Organization**: Tasks are grouped by independently verifiable delivery slice
and ordered to match the requested build sequence.

## Phase 1: Setup

**Purpose**: Establish the web app, deployment baseline, and test harness without
building product behavior yet.

- [x] T001 Initialize the Next.js App Router TypeScript project structure in `package.json`, `tsconfig.json`, `next.config.ts`, and `src/app/layout.tsx`
- [x] T002 Add Drizzle, PostgreSQL, MapLibre GL, Auth.js, Anthropic SDK, Vitest, and Playwright dependencies in `package.json`
- [x] T003 [P] Configure linting, formatting, and TypeScript checks in `eslint.config.mjs`, `.prettierrc`, and `tsconfig.json`
- [x] T004 [P] Configure test commands and base setup in `vitest.config.ts`, `playwright.config.ts`, `tests/unit/setup.ts`, and `tests/e2e/setup.ts`
- [x] T005 Create Railway and local environment documentation in `.env.example` and `README.md`

**Checkpoint**: The empty app installs, typechecks, and has runnable test
commands.

---

## Phase 2: Foundational Schema and Manual Import

**Purpose**: Build the data model, migrations, scoring foundation, and
ManualImportAdapter first so the app can work before any scraper exists.

- [x] T006 Define Drizzle enums and tables for City, Listing, ReviewSignal, UserContribution, User, ClickEvent, and Auth.js support in `src/db/schema.ts`
- [x] T007 Add Drizzle database client and migration configuration in `src/db/client.ts` and `drizzle.config.ts`
- [x] T008 Generate and verify the initial PostgreSQL migration in `src/db/migrations/`
- [x] T009 [P] Add schema constraint tests for score nullability, contribution identity, and editorial field separation in `tests/unit/schema.test.ts`
- [x] T010 Define the ListingSourceAdapter contract in `src/lib/sources/ListingSourceAdapter.ts`
- [x] T011 Implement ManualImportAdapter for CSV and JSON seed files in `src/lib/sources/ManualImportAdapter.ts`
- [x] T012 Add ScraperAdapter as a non-functional replaceable stub in `src/lib/sources/ScraperAdapter.ts`
- [x] T013 Add an import service that depends only on ListingSourceAdapter in `src/lib/sources/importListings.ts`
- [x] T014 [P] Add an architecture test proving no core scoring, UI, route, or affiliate module imports ScraperAdapter in `tests/unit/source-boundary.test.ts`
- [x] T015 Add launch-city seed fixtures with editorial fields and cooling excerpts in `src/db/seed/minty-launch-city.json`
- [x] T016 Implement the transparent Guest Signal formula in `src/lib/scoring/guestSignalFormula.ts`
- [x] T017 [P] Add Guest Signal formula tests for unverified threshold, recency weighting, broken-AC penalty, and low-sample discount in `tests/unit/guest-signal-formula.test.ts`
- [x] T018 Implement trust-tier derivation with separate Handpicked and Editor Verified semantics in `src/lib/scoring/trustTier.ts`
- [x] T019 [P] Add trust-tier tests proving Handpicked and Editor Verified do not collapse into one meaning in `tests/unit/trust-tier.test.ts`
- [x] T020 Add a seed command that imports the launch city through ManualImportAdapter in `src/db/seed/runManualImport.ts`

**Checkpoint**: A launch city can be seeded manually, scored, and queried without
any scraper implementation.

---

## Phase 3: User Story 1 - Map-First Public Discovery (Priority: P1)

**Goal**: Travelers can open the launch city, browse a map and list, and see why
each listing appears.

**Independent Test**: Run the seed command, load the public page, and verify map
pins and side-list rows appear only for listings with evidence or editorial
status.

- [x] T021 [US1] Implement active city loading by configured slug in `src/lib/cities/getActiveCity.ts`
- [x] T022 [US1] Implement public listing query that excludes empty pins in `src/lib/listings/getPublicListings.ts`
- [x] T023 [P] [US1] Create the MapLibre listing map component in `src/components/map/ListingMap.tsx`
- [x] T024 [P] [US1] Create the synchronized side-list shell in `src/components/listing/ListingList.tsx`
- [x] T025 [P] [US1] Create listing card layout with separate Guest Signal and Editor Score slots in `src/components/listing/ListingCard.tsx`
- [x] T026 [US1] Build the public map page using active city, map, and side list in `src/app/(public)/page.tsx`
- [x] T027 [P] [US1] Add browser test for launch-city map rendering and no-empty-pin behavior in `tests/e2e/public-map.spec.ts`

**Checkpoint**: User Story 1 is usable and demonstrable from seeded data.

---

## Phase 4: User Story 2 - Cooling Confidence Filters (Priority: P1)

**Goal**: Travelers can filter the map and list by score, listing type, and trust
tier.

**Independent Test**: Apply each filter on the public page and verify map pins
and side-list items update together.

- [x] T028 [US2] Implement filter state parsing and validation in `src/lib/listings/listingFilters.ts`
- [x] T029 [P] [US2] Create filter controls for score, listing type, and trust tier in `src/components/map/MapFilters.tsx`
- [x] T030 [US2] Apply filters to the public listing query in `src/lib/listings/getPublicListings.ts`
- [x] T031 [US2] Wire filters into the public map page in `src/app/(public)/page.tsx`
- [x] T032 [P] [US2] Add browser tests for score, type, and trust-tier filtering in `tests/e2e/public-filters.spec.ts`

**Checkpoint**: User Story 2 works independently on top of seeded public data.

---

## Phase 5: User Story 3 - Detail, Evidence, and Affiliate Exit (Priority: P1)

**Goal**: Travelers can inspect evidence, see both score rows separately, and
leave through a tracked affiliate booking link.

**Independent Test**: Open a listing detail page, verify separate score rows and
evidence, click booking, and confirm a ClickEvent is recorded before redirect.

- [x] T033 [US3] Implement listing detail query with evidence, score states, AC type, and affiliate URL in `src/lib/listings/getListingDetail.ts`
- [x] T034 [P] [US3] Create ScoreRows component that cannot render a blended score in `src/components/listing/ScoreRows.tsx`
- [x] T035 [P] [US3] Create TrustBadge component with distinct Unverified, Scored, Handpicked, and Editor Verified labels in `src/components/listing/TrustBadge.tsx`
- [x] T036 [P] [US3] Create listing detail component in `src/components/listing/ListingDetail.tsx`
- [x] T037 [US3] Build public listing detail route in `src/app/(public)/listings/[id]/page.tsx`
- [x] T038 [US3] Implement AffiliateLinkBuilder in `src/lib/affiliate/AffiliateLinkBuilder.ts`
- [x] T039 [US3] Implement affiliate click route that records ClickEvent and redirects in `src/app/api/affiliate-click/route.ts`
- [x] T040 [P] [US3] Add unit tests for tracked affiliate URL construction in `tests/unit/affiliate-link-builder.test.ts`
- [x] T041 [P] [US3] Add browser test proving score rows are separate and click tracking runs in `tests/e2e/listing-detail-affiliate.spec.ts`

**Checkpoint**: User Story 3 completes the public MVP loop from discovery to
booking exit.

---

## Phase 6: User Story 5 - Auth and Role Foundations (Priority: P2)

**Goal**: Member and editor account infrastructure exists with secure
passwordless access and role data, but public auth exposure remains gated until
the final flag task.

**Independent Test**: With local test configuration, Auth.js can create and
verify a magic-link user, assign roles, and deny unauthorized role access.

- [x] T042 [US5] Configure Auth.js Email provider and Drizzle adapter in `src/lib/auth/authOptions.ts`
- [x] T043 [P] [US5] Implement role helpers for anonymous, Insider Member, and Editor in `src/lib/auth/roles.ts`
- [x] T044 [US5] Implement auth route handler without public navigation links in `src/app/api/auth/[...nextauth]/route.ts`
- [x] T045 [P] [US5] Add unit tests for role authorization helpers in `tests/unit/roles.test.ts`
- [x] T046 [US5] Add integration test for passwordless account creation and verified user state in `tests/integration/auth-magic-link.test.ts`

**Checkpoint**: Auth and roles work in isolation, but the public site remains
usable without exposing login.

---

## Phase 7: Extraction Pipeline (Priority: P2)

**Goal**: Seeded review excerpts can be classified into cooling signals by a
safe Claude JSON extraction pipeline.

**Independent Test**: Run extraction against fixture review text, verify valid
JSON parsing, ReviewSignal creation, malformed output quarantine, and scoring
recalculation.

- [x] T047 [P] Implement safe Claude JSON parser with code-fence stripping in `src/lib/extraction/parseClaudeJson.ts`
- [x] T048 Implement cooling extractor using Anthropic SDK and `claude-sonnet-4-6` in `src/lib/extraction/coolingExtractor.ts`
- [x] T049 Implement extraction job that creates ReviewSignal rows from seeded excerpts in `src/lib/extraction/runExtraction.ts`
- [x] T050 Implement score recomputation after extraction in `src/lib/scoring/recomputeListingSignals.ts`
- [x] T051 [P] Add parser tests for valid JSON, fenced JSON, invalid JSON, and schema mismatch in `tests/unit/parse-claude-json.test.ts`
- [x] T052 [P] Add extraction integration test with mocked Anthropic responses in `tests/integration/cooling-extraction.test.ts`

**Checkpoint**: Manual seed data can become auditable ReviewSignal rows and
transparent Guest Signal scores.

---

## Phase 8: User Story 4 - Anonymous Contributions (Priority: P2)

**Goal**: Anonymous visitors can confirm, dispute, or report broken AC with
session identity and source auditability.

**Independent Test**: Submit anonymous votes from a browser session and verify
storage, duplicate prevention, dispute status, and score impact rules.

- [x] T053 [US4] Implement anonymous session identity helper in `src/lib/contributions/sessionIdentity.ts`
- [x] T054 [US4] Implement contribution service for confirm-cold, dispute-weak, and broken votes in `src/lib/contributions/contributionService.ts`
- [x] T055 [US4] Implement public contribution route in `src/app/api/contributions/route.ts`
- [x] T056 [P] [US4] Add anonymous contribution controls to detail view in `src/components/listing/AnonymousContributionForm.tsx`
- [x] T057 [P] [US4] Add integration tests for duplicate prevention, source auditability, and disputed listing status in `tests/integration/anonymous-contributions.test.ts`
- [x] T058 [P] [US4] Add browser test for anonymous dispute flow in `tests/e2e/anonymous-dispute.spec.ts`

**Checkpoint**: Anonymous contribution flow works while auth remains disabled.

---

## Phase 9: User Story 5 - Insider Reports (Priority: P2)

**Goal**: Insider Member reports are attributable and weighted above anonymous
contributions in Guest Signal.

**Independent Test**: In auth-enabled test mode, sign in as Insider, submit a
report, and verify attribution plus higher Guest Signal weight.

- [x] T059 [US5] Implement Insider report service in `src/lib/contributions/insiderReportService.ts`
- [x] T060 [US5] Implement Insider report route with role enforcement in `src/app/api/insider/reports/route.ts`
- [x] T061 [P] [US5] Add Insider report form component in `src/components/listing/InsiderReportForm.tsx`
- [x] T062 [P] [US5] Add integration tests for Insider attribution and weighting in `tests/integration/insider-reports.test.ts`

**Checkpoint**: Insider reports can affect Guest Signal separately from
anonymous input.

---

## Phase 10: User Story 6 - Editorial Layer (Priority: P2)

**Goal**: Editors can set Handpicked, Editor Verified, and Editor Score while
public UI keeps each meaning distinct.

**Independent Test**: Seed editorial values while auth is off, then in
auth-enabled test mode update them as Editor and confirm Guest Signal is
unchanged.

- [x] T063 [US6] Implement editorial service for Handpicked, Editor Verified, and Editor Score in `src/lib/editorial/editorialService.ts`
- [x] T064 [US6] Implement editor listing update route with role enforcement in `src/app/api/editor/listings/[id]/route.ts`
- [x] T065 [P] [US6] Build editor listing controls in `src/app/admin/listings/[id]/page.tsx`
- [x] T066 [P] [US6] Add integration tests proving Editor Score updates do not alter Guest Signal in `tests/integration/editorial-service.test.ts`
- [x] T067 [P] [US6] Add browser test proving Handpicked and Editor Verified render as distinct meanings in `tests/e2e/editorial-badges.spec.ts`

**Checkpoint**: Editorial content can be seeded and edited without corrupting
Guest Signal or trust semantics.

---

## Phase 11: Public Deploy Readiness

**Purpose**: Validate the day-one public launch path with auth still off.

- [x] T068 Run migrations and ManualImportAdapter seed against a Railway-like PostgreSQL database using `src/db/seed/runManualImport.ts`
- [x] T069 Verify `AUTH_ENABLED=false` public behavior manually and with Playwright in `tests/e2e/public-auth-disabled.spec.ts`
- [x] T070 Verify launch-city map, filters, detail, anonymous dispute, affiliate click tracking, and no-empty-pin behavior in `tests/e2e/public-launch-smoke.spec.ts`
- [x] T071 Document the launch runbook for `mintystays.com` in `docs/launch-runbook.md`

**Checkpoint**: MintyStays can deploy publicly with no login flow exposed.

---

## Phase 12: Final Auth Feature-Flag Wiring

**Purpose**: Wire and verify the final `AUTH_ENABLED` switch after schema, auth,
roles, Insider logic, and editor logic already exist.

- [x] T072 Add centralized `AUTH_ENABLED` helper with default false in `src/lib/auth/featureFlag.ts`
- [x] T073 Wire `AUTH_ENABLED` into login links, auth route availability, member controls, editor controls, and protected server actions across `src/app/`, `src/components/listing/`, and `src/lib/auth/`
- [x] T074 Add tests proving public site behavior is unchanged with `AUTH_ENABLED=false` in `tests/e2e/public-auth-disabled.spec.ts`
- [x] T075 Add tests proving Insider and Editor flows become reachable with `AUTH_ENABLED=true` in `tests/e2e/auth-enabled-flows.spec.ts`
- [x] T076 Document the flag flip procedure and rollback checks in `docs/auth-feature-flag.md`

**Checkpoint**: Flipping `AUTH_ENABLED` is a single, independently verifiable
release action.

---

## Dependencies & Execution Order

- **Setup**: T001-T005 have no dependencies.
- **Foundational**: T006-T020 depend on setup and block all product stories.
- **Public Discovery**: T021-T027 depend on seeded data and scoring foundation.
- **Filters**: T028-T032 depend on public listing query and map/list UI.
- **Detail and Affiliate**: T033-T041 depend on public listings and schema.
- **Auth Foundations**: T042-T046 depend on schema, but not on public map work.
- **Extraction**: T047-T052 depend on ReviewSignal schema and scoring services.
- **Anonymous Contributions**: T053-T058 depend on listing detail and scoring.
- **Insider Reports**: T059-T062 depend on auth foundations and contributions.
- **Editorial Layer**: T063-T067 depends on schema, roles, and trust-tier logic.
- **Public Deploy Readiness**: T068-T071 depends on public MVP and contribution
  flow.
- **Final Auth Feature-Flag Wiring**: T072-T076 must remain last.

## Parallel Opportunities

- T003-T004 can run in parallel after T001.
- T009, T014, T017, and T019 can run in parallel with their target modules.
- T023-T025 can run in parallel once T021-T022 define public listing shape.
- T034-T036 can run in parallel after T033.
- T047 and T051 can run in parallel before the Anthropic integration.
- Anonymous, Insider, and Editorial UI components can be built in parallel with
  their route tests once services are defined.

## Implementation Strategy

1. Complete schema, migrations, ManualImportAdapter, scoring, and trust-tier
   tests first.
2. Deliver the public map, list, filters, detail, affiliate click tracking, and
   anonymous disputes before exposing any auth-dependent workflow.
3. Build auth, role, Insider, and Editor internals while keeping public
   deployment functional with auth off.
4. Add extraction after the manual seed path is already useful.
5. Validate Railway public launch with `AUTH_ENABLED=false`.
6. Wire the auth feature flag last so turning on login is a deliberate,
   reversible release step.
