# MintyStays UX & Design System

**Branch**: `001-minty-stays` | **Date**: 2026-06-29 | **Owner of intent**: this doc
is the visual contract codex implements against. Where it conflicts with existing
CSS, this doc wins.

**Input**: The MVP shipped a functional but flat "editorial almanac" UI. This
revamp elevates it into a premium, on-brand ("actually cold") consumer product
without changing the data model's trust guarantees.

**Rendered reference**: `design-reference.html` (this folder) is a static
mockup of the signature Night Frost direction (thermal Cold Index, dual gauge,
confidence, conflict reconciliation). Open it in a browser as the visual target;
it ships nowhere.

## 1. Vision & Principles

MintyStays answers one question a traveler feels in their body: *will this room
actually be cold?* The UI must make coldness legible, trustworthy, and beautiful.

1. **Thermal-first.** Coldness is the brand. Every score, pin, and gauge is
   colored on one shared **Cold Index** scale (glacier-blue = cold → red = hot).
   A traveler should read "cold vs weak" in one glance, before reading a number.
2. **Photography-forward.** Accommodation discovery is visual. Cards and detail
   lead with imagery; a branded thermal placeholder stands in when no licensed
   photo exists (never a broken image, never an unlicensed scrape).
3. **Two signals, never one number.** The dual-score model is the product's
   signature. Guest Signal and Editor Score are rendered as two visually distinct
   gauges that share the Cold Index scale but are NEVER merged into an overall
   value (constitution Laws I and VIII).
4. **Honest uncertainty.** Confidence is a first-class visual, not gray footnote
   text. A low-confidence 68 must look less certain than a high-confidence 68.
5. **Cold, calm, fast.** Frosted glass, restrained motion, instant filter
   feedback. Premium through spacing and craft, not decoration.

## 2. Constitution compliance (read before building)

- **No blended score.** There is no combined gauge, no "overall cold" number, no
  averaged pin color. The Cold Index colors each score independently. A card
  shows two gauges; a pin encodes exactly one chosen score (see 6.4) and labels
  which one.
- **Trust tiers stay distinct** (Law II, FR-028). Editor Verified and Handpicked
  never share a chip shape or color. Only Editor Verified carries the verified
  accent + check glyph.
- **Confidence is shown** for every numeric Guest Signal (Law IV, FR-008a).
- **Conflict is reconciled, not hidden** (Law VIII, FR-027). See 6.6.
- **No empty pins** (Law VI). The visual system must still render only listings
  with evidence or editorial status.

## 3. Design tokens

Implement as CSS custom properties on `:root` (light) and `[data-theme="dark"]`.
Theme is user-toggleable and defaults to `prefers-color-scheme`.

### 3.1 Color — Light "Daybreak Frost"

```
--bg:            #EEF3F6;   /* cool mist */
--bg-grad-top:   #F4F9FB;
--surface:       #FFFFFF;
--surface-2:     #F4F8FA;
--surface-frost: rgba(255,255,255,0.72);  /* + backdrop-blur(14px) */
--ink:           #0B1417;
--muted:         #47575C;
--faint:         #7C8B90;
--line:          #DCE6EA;
--line-strong:   #C4D2D8;
--brand:         #0E7C6B;   /* cold teal, brand continuity */
--brand-hover:   #0A6858;
--brand-soft:    #D8EEE8;
--handpicked:    #B4772A;   /* brass, taste tier — distinct from brand */
--handpicked-soft:#F3E4C6;
--focus:         #1E78B4;
```

### 3.2 Color — Dark "Night Frost" (the signature mode)

```
--bg:            #0A1418;
--bg-grad-top:   #0E1B22;
--surface:       #0F1E24;
--surface-2:     #12242B;
--surface-frost: rgba(18,36,43,0.62);      /* + backdrop-blur(16px) */
--ink:           #EAF3F5;
--muted:         #9DB2B8;
--faint:         #6E858C;
--line:          #21353D;
--line-strong:   #2C444D;
--brand:         #37C9AC;   /* luminous cold */
--brand-hover:   #57DBC0;
--brand-soft:    #123029;
--handpicked:    #D8A24E;
--handpicked-soft:#2A2114;
--focus:         #59B7EA;
```

### 3.3 The Cold Index scale (shared by both scores)

Five bands. Each has a solid color (fills, pins) and a soft tint (chip
backgrounds). Dark-mode values in parentheses are brighter for contrast.

| Band | Score range | Solid (light / dark) | Soft (light / dark) | Label |
|------|-------------|----------------------|---------------------|-------|
| Glacier | 85–100 | `#1E78B4` / `#4FA6E0` | `#DCEBF6` / `#12283A` | Freezing cold |
| Cool | 70–84 | `#0E9E86` / `#37C9AC` | `#D6F0EA` / `#123029` | Reliably cold |
| Temperate | 55–69 | `#6FA13C` / `#93C55E` | `#E6F0D6` / `#1E2A15` | Adequate |
| Warm | 40–54 | `#D08A2A` / `#E3A94E` | `#F6E7C8` / `#2A2114` | Runs warm |
| Hot | 0–39 | `#C24B46` / `#E36B64` | `#F6D9D6` / `#341917` | Weak / broken |

Editor Score maps onto the same bands so the two gauges read on one language:
`verified_cold → Glacier`, `verified_adequate → Temperate`,
`verified_weak → Warm`, `verified_broken → Hot`.

Expose one function `coldIndex(score: number)` and one
`coldIndexForEditorScore(editorScore)` returning `{ band, solid, soft, label }`.
These are the ONLY places color is chosen from a score, and they never take both
scores as input (structural guard against blending).

### 3.4 Type

Load via `next/font/google`, expose as CSS vars. No more raw "Georgia".

```
--font-display: "Fraunces", Georgia, serif;   /* variable, high-contrast; opsz on */
--font-body:    "Inter", system-ui, sans-serif;
--font-mono:    "IBM Plex Mono", "SF Mono", monospace;  /* score numerals */
```

Type ramp (px / line-height): 12/16, 14/20, 16/24, 18/26, 22/28, 28/32, 40/44,
56/58, 72/72 (detail hero). Display serif for city names, listing titles, section
heads; body for everything else; mono only for scores and counts.

### 3.5 Space, radius, elevation, motion

```
space:  4, 8, 12, 16, 24, 32, 48, 64
--r-xs: 6; --r-sm: 10; --r-md: 14; --r-lg: 20; --r-pill: 999;
--e1: 0 1px 2px rgba(10,20,24,.06);
--e2: 0 10px 30px -16px rgba(10,20,24,.30);
--e3: 0 30px 70px -34px rgba(10,20,24,.45);
--ease: cubic-bezier(.2,.7,.2,1);
durations: 120ms (hover), 200ms (enter), 320ms (map fly / sheet)
```

Frosted surfaces (topbar, map console, bottom sheet) use `--surface-frost` +
`backdrop-filter: blur()`. Honor `prefers-reduced-motion` (disable fly-to and
shimmer, keep instant states).

## 4. Signature component: the Dual Cold Gauge

The most important new component. Replaces the current stacked `.score-row` text.

- Two side-by-side (desktop) / stacked (mobile) gauges under a shared header
  "Cooling signals".
- **Guest Signal gauge**: a thermal arc or bar filled to `score%` in the band's
  solid color, the number in mono at the band color, a **confidence treatment**:
  the segment beyond the Wilson band is rendered hatched/translucent so a
  low-confidence score visibly "fuzzes out" at the edge; a small dot + label
  (`high`/`moderate`/`low`) sits beside it. Sub-label: `N cooling mentions`.
  Unverified state: no bar, a frosted "Unverified" chip + "needs 3+ mentions".
- **Editor Score gauge**: a discrete 4-notch scale (cold/adequate/weak/broken)
  with the active notch lit in its band color and a check glyph; label
  "Human check". Absent state: dashed outline + "Not yet verified".
- A thin vertical divider and the caption "Kept separate. Never averaged."
- The two gauges must be independently rendered from independent props; there is
  no shared "value" prop. Add a unit test asserting the component has no combined
  numeric output (extends the no-blend guard, T009a).

## 5. Data & schema deltas (codex: schema + seed)

Imagery is required for the revamp. Add to `listings`:

- `image_url text` (nullable) — primary hero/card photo, only from a licensed
  source (property/affiliate-provided or a permissively licensed source).
- `image_attribution text` (nullable) — shown when the source requires credit.
- `photo_gallery jsonb` (nullable) — optional array of `{url, attribution?}` for
  the detail gallery.

When `image_url` is null, render a **branded thermal placeholder**: a generated
gradient tile in the listing's Guest Signal (or Editor) band color with the
snowflake mark and the city name, so cards never look broken and no unlicensed
image is ever fetched. Seed fixtures set `image_url` only where a lawful image
exists; otherwise leave null and rely on the placeholder. This keeps the revamp
launchable under the same legal posture as the data (see spec Assumptions).

No scoring, trust-tier, or two-score data changes. This is presentation only plus
optional imagery.

## 6. Component specs

### 6.1 App shell & theme

- Frosted sticky topbar: brand lockup (snowflake mark + "MintyStays" in Fraunces
  + "Actually cold stays / {city}"), a **theme toggle** (sun/moon), "Formula"
  link, conditional "Sign in". Filters move OUT of the topbar into the explorer
  (see 6.7) on desktop to de-clutter.
- Background: subtle top-down glacier gradient (`--bg-grad-top` → `--bg`), not
  flat.

### 6.2 Listing card (photo-forward)

- 16:10 image (or thermal placeholder) with a **Cold Index chip** overlaid
  top-left (band color + number, or "Unverified") and the **trust badge**
  top-right. Selected/hover: lift with `--e2`, 1.02 image scale, brand ring.
- Body: type pill (Hotel/Rental) + AC type with snowflake; serif title; location
  meta; a compact **Dual Cold Gauge** (mini variant); one line of evidence;
  "View detail →". If `signalsConflict` (6.6), a "Signals disagree" pill.
- Card ↔ pin hover/selection stays synchronized (existing behavior, keep + add
  smooth transitions).

### 6.3 Custom map style

- Replace raw positron with a **branded frost style** (light) and **night style**
  (dark): desaturated land, cold-tinted water, muted labels, roads pulled back so
  pins dominate. Provide as two MapLibre style JSON URLs via env
  (`MAP_STYLE_URL`, `MAP_STYLE_URL_DARK`) with positron/dark-matter as fallbacks.
- Water gets a faint glacier tint; the selected listing's neighborhood subtly
  lifts. Keep it legible and fast.

### 6.4 Map pins

- **Scored pin**: rounded squircle chip, band-colored, mono numeral, soft white
  ring; drop shadow `--e2`. This encodes ONE score — default Guest Signal; if
  Guest Signal is Unverified but an Editor Score exists, the pin encodes the
  Editor band and shows a check glyph instead of a number. A tiny corner glyph
  states which signal the color came from (person vs check). Never a blended color.
- **Unrated pin** (evidence/handpicked only, no number): a hollow frosted ring
  with a small center dot — deliberate, calm, NOT a "?" that reads as an error.
- **Selected**: scale 1.15, `--e3`, brand ring, map `flyTo` (respect reduced
  motion).
- **Clustering** at low zoom: a frosted circle with the count, tinted by the
  median band of its members; expands on click. Document the zoom threshold.

### 6.5 Confidence treatment

- Guest Signal bar: fill to `score`, then render the uncertainty region as a
  hatched/translucent overlay so uncertainty is visible. A pill shows
  `high` (filled dot) / `moderate` (half dot) / `low` (hollow dot) + the mention
  count. Low confidence also slightly desaturates the number.
- Until the Wilson band width is persisted on the listing DTO, the hatch width
  derives from the confidence tier (high 8, moderate 16, low 24 track-percent),
  centered on the score edge and clamped to the track. Swapping to the true
  `± bandWidth/2` is a follow-up once the score pipeline stores band width.

### 6.6 Conflict reconciliation (Law VIII / FR-027)

When `signalsConflict` is true (plan.md Guest/Editor Conflict Rule):

- Card: a `Signals disagree` pill in a neutral (not thermal) slate tone.
- Detail: a dedicated **reconciliation panel** sitting between (never merging)
  the two gauges, with an ice/alert motif and copy driven by direction:
  - editor lower than guests: *"Guests usually report it cold, but our reviewer
    measured weak cooling under peak summer load. When these disagree, trust the
    on-site check for worst-case heat."*
  - editor higher than guests: *"Some guest reports flag weak cooling, but our
    reviewer confirmed strong cooling in person. Older or off-season complaints
    may not reflect the current unit."*
- This is a trust moment: make it calm and confident, not an error state.

### 6.7 Filters

- Desktop: a slim filter rail docked above the list (not crammed in the topbar).
  Segmented controls for Stay Type and Trust Tier; a **Min Cold Index slider**
  whose track is the thermal gradient with a frosted thumb; instant client-side
  apply (keep URL sync). "Reset" as a quiet ghost button.
- The trust-tier control must keep the four tiers visually distinct and label
  Editor Verified vs Handpicked per FR-028.

### 6.8 Detail page

- Full-bleed **hero image** (or thermal placeholder) with a gradient scrim; over
  it: trust badge, serif title (Fraunces 56–72), type + location + AC type.
- A **sticky score panel** (desktop right rail / mobile below hero) housing the
  full Dual Cold Gauge, confidence, "See the formula", and the reconciliation
  panel when conflicting.
- Fact tiles (AC type, evidence count, booking) refined with the elevation and
  band accents. Evidence "Cooling read" panel. Optional photo gallery.
- Booking CTA in brand color; contribution form ("How was the cooling?")
  restyled as segmented thermal choices (Confirm cold / Dispute weak / Broken).

### 6.9 Mobile

- Map fills the viewport; the list becomes a **draggable bottom sheet** (peek →
  half → full) over the map (Airbnb pattern). Filters open in a sheet from a
  floating "Filters" button. Theme toggle in a compact menu.

### 6.10 States & motion

- **Empty**: a frosted card with a small snowflake/thermometer illustration and
  "No cold stays match these filters" + a reset affordance (keep the no-empty-pin
  law; this is the filtered-to-zero case).
- **Loading**: frosted skeleton shimmer for cards and the score gauges.
- **Motion**: card hover lift, pin select fly-to, filter cross-fade, sheet drag,
  theme cross-fade. All gated by `prefers-reduced-motion`.

## 7. Accessibility & quality bar

- WCAG AA contrast for text on every band tint in both themes (verify the amber
  and glacier tints specifically). Never encode a score by color alone — always
  pair with the number/label (colorblind-safe).
- Full keyboard path: filters, pins (focusable, arrow-navigable), cards, detail.
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.
- Lighthouse: performance ≥ 90 on the map page at MVP volume; no layout shift
  from image loads (reserve aspect-ratio boxes; use blur/placeholder).

## 8. Out of scope / follow-ups

- Real property photography licensing pipeline (launch uses licensed-or-placeholder).
- Animated thermal map heat layer (post-MVP).
- Server-side clustering (tied to the multi-city / >2k-listings trigger in plan.md).
