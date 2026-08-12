# MintyStays Data Acquisition Strategy

**Branch**: `001-minty-stays` | **Date**: 2026-06-29 | **Status**: proposal,
pending risk-posture decision (§6)

**Input**: The launch board renders almost entirely "Unverified" because the
product has no AC review volume. This doc decides how MintyStays acquires
cooling signal without endangering its affiliate revenue, its legal standing, or
constitution Law III (seeding sources swappable, launch works without scraping).

## 1. The real problem

Guest Signal needs 3+ cooling mentions to render a number. Lawful review sources
return few reviews per property, and only a fraction mention AC. So numeric Guest
Signal is structurally sparse at launch regardless of source. Two consequences
drive this strategy:

1. **Signal accrues; it is not bought in bulk.** Ingest continuously from lawful
   sources and first-party contributions; let scores mature.
2. **The launch hero is the human layer, not the crowd number.** The board must
   be full of Editor Verified and Handpicked cold stays on day one, with Guest
   Signal filling in over weeks. This is also the moat: a curated "actually cold"
   list is defensible; a scraped review mirror is a commodity and a liability.

## 2. Per-source assessment

| Source | Yields | Legality / ToS | Risk to MintyStays | Verdict |
|--------|--------|----------------|--------------------|---------|
| **Google Places API (New)** | Up to **5 reviews/property** with text, rating, and `publishTime` (authored date) | Official, licensed. Display + attribution rules; limited caching | Low. Costs ~$17–25 / 1k Place Details (reviews) — launch city is a few dollars | **PRIMARY.** Feeds recency/seasonality directly |
| **Booking.com Demand API `/reviews`** | Review text + category filters (cleanliness, staff, …); no AC category | Official but **pilot access** via account manager | Low once approved; none to the affiliate account | **APPLY.** Secondary once granted |
| **First-party contributions** | Anonymous confirm/dispute/broken + Insider reports, with authored date = now | Fully owned data | None | **CORE.** Already built; the compounding engine |
| **Manual research (paraphrased)** | 1–2 cooling themes/listing, editor-observed | Lawful if paraphrased, no bulk automation, no wall bypass (see `research-intake.md`) | Low | **LAUNCH SEED.** Already the path |
| **TripAdvisor Content API** | Location details + up to 5 reviews | Official, partner-gated; requires attribution + link-back, caching limits | Low–moderate (attribution obligations) | Optional later |
| **Third-party review vendors** (Outscraper, SerpAPI, Apify) | Google/Booking reviews at scale | Vendor scrapes upstream; ToS-violating at the source, you consume the output | Moderate: shifts but does not remove ToS exposure; can still taint the Booking affiliate relationship | Gray — only under an explicit accepted-risk posture (§6) |
| **Scraping Booking.com directly** | Unlimited reviews | Violates Booking ToS | **High: risks termination of the affiliate account you monetize** | **Do not.** |
| **Scraping Airbnb** | STR reviews | No public API; program dead 2021; actively litigated | **High: legal exposure; no stable IDs for de-dup** | **Do not.** STR signal comes from contributions + manual/editorial |

## 3. Recommended pipeline (lawful-first)

All sources implement the existing `ListingSourceAdapter` boundary (Law III). Core
scoring/UI never import a source implementation directly.

```
GooglePlacesAdapter   -> raw_reviews (source="places", authored_at, content_hash)
VendorReviewAdapter   -> raw_reviews (source="vendor_google")  [posture B, flagged off, Google-only]
BookingDemandAdapter  -> raw_reviews (source="booking_api")   [when pilot approved]
ManualImportAdapter   -> raw_reviews (source="manual", paraphrased)
Contributions (live)  -> review_signals (anonymous/insider, authored_at = now)
        |
   cooling_extractions (cache by content_hash, keyword pre-filter, LLM classify)
        |
   Guest Signal (recency + seasonality) — sparse by design at launch
        |
   Editor Verified / Handpicked (human layer) — the launch hero
```

- **GooglePlacesAdapter** is the first non-manual adapter to build. Cache by
  `content_hash`; store `publishTime` as `authored_at`; respect Google's caching
  and attribution terms (show "Reviews via Google" where required, do not persist
  beyond allowed windows — store the derived cooling classification, not a
  permanent verbatim copy).
- **De-dup across sources** on `content_hash`; a Google review and a manual
  paraphrase of the same stay are distinct rows, both dated.
- **STR (Airbnb) has no lawful review API.** STR Guest Signal is
  contribution-driven; STR launch inventory is Editor Verified / Handpicked only.

## 4. What "a product people use" actually requires

- **Day one**: 25–40 Lisbon stays, each Editor Verified or Handpicked, with a
  paraphrased evidence summary and a photo. The board looks curated and cold, not
  empty. Guest Signal shows where it legitimately can, "Unverified" (honestly)
  elsewhere.
- **Weeks 1–8**: GooglePlacesAdapter runs weekly; contributions accumulate;
  Guest Signal numbers begin to appear and mature. The confidence band does the
  honesty work while samples are small.
- **The pitch**: "hand-checked and crowd-verified cold stays," not "every hotel
  scraped." Trust is the differentiator.

## 5. Constitution & legal guardrails

- Law III: every source is a `ListingSourceAdapter`; `ScraperAdapter` stays a
  clearly-labeled, unused stub. Core logic imports no source implementation.
- Never store verbatim third-party review text long-term; store the paraphrase or
  the derived cooling classification + a short cited excerpt within license terms.
- Never scrape a site whose affiliate program funds the product (Booking).
- STR: no scraping, ever.

## 6. Risk-posture decision (owner: product)

The build forks on how much data-acquisition risk MintyStays accepts. This is a
business/legal call, not an engineering default:

- **A. Lawful-only (recommended)**: Google Places + Booking Demand (pilot) +
  manual + contributions. Zero ToS/affiliate exposure. Slower signal growth.
- **B. Lawful + gray vendors**: add a licensed-scraper vendor (e.g. Outscraper)
  for Google reviews at scale, behind the adapter boundary and behind a
  legal review. More volume, moderate residual exposure.
- **C. Direct scraping**: not recommended; violates Law III and endangers the
  affiliate account. Documented here only to be explicitly rejected.

Selected posture: **B — Lawful + gray vendors** (2026-06-29). Build the posture-A
pipeline first, then add one `VendorReviewAdapter` under these hard constraints:

- **Google reviews only.** Never point a vendor at Booking.com (it funds the
  product via affiliate) or Airbnb (active litigation, no stable IDs).
- **Behind the `ListingSourceAdapter` boundary** like every other source (Law III).
- **Feature-flagged off until legal sign-off** (`VENDOR_INGEST_ENABLED=false` by
  default); enabling it is a deliberate, logged decision.
- **Store paraphrase / derived cooling classification + a short cited excerpt**,
  never a permanent verbatim review dump; honor attribution.
- If the Google Places API alone proves sufficient for launch, the vendor stays
  off. It is a scale lever, not a launch dependency.

## 7. Tasks

See tasks.md Phase 15 (Data ingestion). GooglePlacesAdapter is the first build
once a posture is selected.
