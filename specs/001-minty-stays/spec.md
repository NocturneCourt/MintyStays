# Feature Specification: MintyStays MVP

**Feature Branch**: `001-minty-stays`

**Created**: 2026-06-26

**Status**: Draft

**Input**: Product description for a map-first accommodation discovery app that
surfaces hotels and short-term rentals with genuinely effective air conditioning.

## User Scenarios & Testing

### User Story 1 - Find Cold Stays on a Map (Priority: P1)

A traveler visiting the launch city opens MintyStays and immediately sees a map
with pins and a synchronized side list of hotels and short-term rentals that
have credible cooling evidence or editorial status.

**Why this priority**: This is the core product promise. Without a useful public
map, no other workflow matters.

**Independent Test**: With seeded launch-city data, a traveler can load the city,
scan the map and list, and identify at least one listing that explains why it is
included.

**Acceptance Scenarios**:

1. **Given** an active launch city with seeded listings, **When** a traveler
   opens MintyStays, **Then** the map centers on that city and shows only active
   listings with cooling evidence or editorial status.
2. **Given** visible listings on the map, **When** the traveler selects a pin,
   **Then** the matching listing is highlighted in the side list and displays
   its name, type, trust tier, Guest Signal state, Editor Score state, and AC
   type if known.
3. **Given** no listings match the active filters, **When** the traveler views
   the map and list, **Then** the page clearly reports that no cold-stay matches
   are available for the current filters.

---

### User Story 2 - Filter by Cooling Confidence (Priority: P1)

A traveler narrows the map and list by Guest Signal score, listing type, and
trust tier to focus on accommodations that match their tolerance for risk.

**Why this priority**: The value of MintyStays depends on letting travelers
separate strongly evidenced listings from weaker or editorial-only candidates.

**Independent Test**: Starting from the launch-city map, a traveler can apply
each MVP filter and see the map pins and side list update consistently.

**Acceptance Scenarios**:

1. **Given** listings with different Guest Signal states, **When** the traveler
   filters by minimum Guest Signal score, **Then** only scored listings meeting
   that threshold remain visible.
2. **Given** hotel and short-term rental listings, **When** the traveler filters
   by listing type, **Then** only the selected type remains visible.
3. **Given** listings with Unverified, Scored, Handpicked, and Editor Verified
   badges, **When** the traveler filters by trust tier, **Then** each badge type
   remains selectable and semantically distinct.

---

### User Story 3 - Inspect Evidence and Leave for Booking (Priority: P1)

A traveler opens a listing detail view, compares Guest Signal and Editor Score
as separate signals, reads the evidence summary, and clicks an affiliate booking
link.

**Why this priority**: Trust comes from explaining the cooling signal, and day-one
monetization depends on tracked outbound booking interest.

**Independent Test**: A listing detail page shows both score rows separately,
never blends them, includes evidence, and records outbound booking intent when
the traveler clicks the booking link.

**Acceptance Scenarios**:

1. **Given** a listing with at least three cooling mentions, **When** the
   traveler views detail, **Then** Guest Signal appears as a 0-100 number with
   its status and evidence context.
2. **Given** a listing with fewer than three cooling mentions, **When** the
   traveler views detail, **Then** no Guest Signal number appears and the Guest
   Signal status is "Unverified".
3. **Given** a listing with an Editor Score, **When** the traveler views detail,
   **Then** Editor Score appears as a separate labeled row or badge and is not
   averaged into Guest Signal.
4. **Given** a listing with an affiliate link, **When** the traveler clicks to
   book, **Then** MintyStays records the outbound click and sends the traveler
   to the booking destination.

---

### User Story 4 - Dispute or Confirm Cooling Anonymously (Priority: P2)

An anonymous visitor can confirm that a listing was cold, dispute weak cooling,
or report broken AC without creating an account.

**Why this priority**: Anonymous reports provide fast signal freshness while the
member and editor workflows remain gated.

**Independent Test**: A visitor without an account can submit one cooling vote
for a listing from a browser session, and that contribution is stored as an
anonymous source without exposing member-only features.

**Acceptance Scenarios**:

1. **Given** a public listing detail page, **When** an anonymous visitor submits
   "confirm cold", **Then** the contribution is recorded as anonymous and
   associated with the listing and session.
2. **Given** a public listing detail page, **When** an anonymous visitor submits
   "dispute weak" or "broken", **Then** the listing can be marked for dispute
   review and the contribution remains separately auditable.
3. **Given** a browser session that already contributed to a listing, **When**
   the visitor attempts another anonymous vote, **Then** the system prevents
   duplicate vote inflation for that listing and session.

---

### User Story 5 - Submit Insider Reports (Priority: P2)

An Insider Member signs in and submits a cooling report that is attributed to
their account and weighted above anonymous input in Guest Signal.

**Why this priority**: Trusted travelers can improve signal quality beyond the
seeded baseline and anonymous disputes.

**Independent Test**: With member access enabled, an Insider Member can sign in,
submit a report, and see that the report is attributable and weighted as an
Insider source while public browsing still works without login.

**Acceptance Scenarios**:

1. **Given** member access is enabled, **When** an Insider Member requests a
   passwordless sign-in link and verifies it, **Then** they can access member
   contribution controls.
2. **Given** a signed-in Insider Member, **When** they submit a cooling report,
   **Then** the report is stored with the member identity and Insider source.
3. **Given** member access is disabled, **When** a visitor browses the public
   site, **Then** the map, cards, filters, affiliate links, and anonymous
   disputes remain functional without login.

---

### User Story 6 - Curate and Verify Editorial Signals (Priority: P2)

An Editor can mark a listing as Handpicked, mark it as Editor Verified after
direct confirmation, and set the Editor Score.

**Why this priority**: Human verification is a core differentiator and must be
modeled from day one, even when editor login is not publicly enabled.

**Independent Test**: Editorial status can exist on public listings from seeded
data while auth is disabled, and with editor access enabled an Editor can set or
change Handpicked, Editor Verified, and Editor Score without affecting Guest
Signal.

**Acceptance Scenarios**:

1. **Given** a listing selected by the editorial team, **When** it is marked
   Handpicked, **Then** the public UI presents it as a curation signal and not
   as direct verification.
2. **Given** a listing directly checked by a trusted human, **When** it is marked
   Editor Verified and assigned an Editor Score, **Then** the public UI presents
   it as an evidence claim separate from Guest Signal.
3. **Given** a listing with both Guest Signal and Editor Score, **When** an
   Editor updates the Editor Score, **Then** Guest Signal remains unchanged.

### Edge Cases

- Listings with fewer than three cooling mentions show "Unverified" instead of
  a numeric Guest Signal.
- A recent broken or non-working AC mention triggers the hard Guest Signal
  penalty even if older reviews were positive.
- A listing can have an Editor Score while Guest Signal is Unverified.
- A listing can have a Guest Signal while Editor Score is absent.
- Handpicked and Editor Verified can both be relevant, but they remain distinct
  in meaning, data, and UI labels.
- Public browsing must work when member and editor login are disabled.
- No public map pin appears for a listing that lacks cooling evidence and lacks
  editorial status.
- Affiliate URLs may be unavailable for a seeded listing; the detail view must
  avoid presenting a dead booking action.

## Requirements

### Functional Requirements

- **FR-001**: The system MUST support at least one active launch city and allow
  the active city to be changed by configuration.
- **FR-002**: The system MUST support both hotel and short-term rental listings.
- **FR-003**: The system MUST present a map-first public experience with map pins
  and a synchronized side list.
- **FR-004**: Travelers MUST be able to filter visible listings by minimum Guest
  Signal score, listing type, and trust tier.
- **FR-005**: Every public listing card MUST show Guest Signal and Editor Score
  as distinct rows or states when present.
- **FR-006**: Guest Signal MUST be a 0-100 score computed only from eligible
  review signals, anonymous contributions, and Insider contributions.
- **FR-007**: Guest Signal MUST show no number and use "Unverified" when fewer
  than three cooling mentions exist.
- **FR-008**: Guest Signal MUST include recency weighting, a hard penalty for any
  broken or non-working AC mention in the trailing 12 months, and a
  low-sample-size discount.
- **FR-009**: The Guest Signal formula MUST be documented in a way a non-editorial
  stakeholder can understand and audit.
- **FR-010**: Editor Score MUST be displayed separately and MUST NOT be averaged,
  blended, or silently merged into Guest Signal.
- **FR-011**: The trust badges Unverified, Scored, Handpicked, and Editor
  Verified MUST remain separately represented and understandable.
- **FR-012**: Handpicked MUST indicate editorial selection only and MUST NOT imply
  direct cooling verification.
- **FR-013**: Editor Verified MUST indicate direct trusted human confirmation and
  MUST set or accompany an Editor Score.
- **FR-014**: Listing details MUST show AC type when known, cooling evidence, the
  trust badge, Guest Signal status, Editor Score status, and an affiliate booking
  action when available.
- **FR-015**: The system MUST track the source of each signal as scraped,
  anonymous, Insider, or editorial.
- **FR-016**: Scraped review signals and human contributions MUST remain
  separately auditable.
- **FR-017**: Anonymous visitors MUST be able to submit confirm-cold,
  dispute-weak, or broken-AC contributions using session identity.
- **FR-018**: Insider Members MUST be able to sign in with passwordless account
  access when member access is enabled.
- **FR-019**: Insider Member reports MUST be attributable to the member and
  weighted above anonymous contributions in Guest Signal.
- **FR-020**: Editors MUST be able to set Handpicked, Editor Verified, and Editor
  Score when editor access is enabled.
- **FR-021**: Editorial fields MUST be seedable without login so editorial content
  can appear on the public site while member and editor access are disabled.
- **FR-022**: The public site MUST deploy and function with member and editor
  access disabled.
- **FR-023**: The system MUST provide affiliate booking links from launch when a
  listing has an eligible booking destination.
- **FR-024**: The system MUST record outbound booking click events for analysis.
- **FR-025**: The system MUST not depend on scraping as the only way to seed
  listings or review evidence.
- **FR-026**: The system MUST not show public listings that lack both cooling
  evidence and editorial status.

### Key Entities

- **City**: A launch or expansion market with name, country, slug, map center,
  and active state.
- **Listing**: A hotel or short-term rental with location, source, booking link,
  AC metadata, score states, editorial states, evidence summary, and public
  status.
- **Review Signal**: A cooling-related interpretation of a review or report,
  including source, sentiment, AC hint, weight, evidence excerpt, and extraction
  time.
- **User Contribution**: A confirm, dispute, or broken-AC report from an
  anonymous visitor or Insider Member.
- **User**: An authenticated Insider Member or Editor with verified account state.
- **Click Event**: A recorded outbound booking click associated with a listing
  and anonymous or signed-in identity when available.

## Success Criteria

### Measurable Outcomes

- **SC-001**: A first-time traveler can identify a launch-city listing with
  credible cooling evidence from the map in under 30 seconds.
- **SC-002**: 100% of public listing cards and detail views display Guest Signal
  and Editor Score separately whenever either value exists.
- **SC-003**: 0 public map pins appear without cooling evidence or editorial
  status in seeded launch data.
- **SC-004**: Listings with fewer than three cooling mentions never display a
  numeric Guest Signal.
- **SC-005**: Anonymous dispute submission completes without account creation and
  records source, listing, session, vote, and timestamp.
- **SC-006**: With member access disabled, public browsing, filters, anonymous
  disputes, evidence display, and affiliate links remain functional.
- **SC-007**: With member access enabled, an Insider Member can complete
  passwordless sign-in and submit an attributable weighted report.
- **SC-008**: An Editor can set Handpicked, Editor Verified, and Editor Score
  without changing the Guest Signal calculation.
- **SC-009**: Outbound booking clicks are recorded for every affiliate action
  before the traveler leaves MintyStays.

## Assumptions

- The first launch city will be selected outside this specification and stored
  as configuration.
- Initial inventory can come from manual CSV or JSON import with lawful evidence
  excerpts or paraphrased cooling themes.
- Editorial content may exist before editor login is enabled because seeded data
  can set editorial fields.
- The public MVP does not need user profiles, saved lists, payments, or general
  accommodation reviews.
- MintyStays summarizes cooling evidence and does not republish full third-party
  review text.
