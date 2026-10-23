# SPEC — Browse eclipses through time

**Status:** shipped in castiarena/eclipses#4 (data), #5 (state), #6 (UI). Departures from this spec are listed at the end.

## Context
Today the app shows only the **next** eclipse of the selected type (`useEclipseCountdown` → `nextEclipseAfter`). The dataset covers just 10 years forward from build time (`scripts/build-eclipse-data.ts`, `WINDOW_YEARS = 10`, window starts at `Date.now()`), so no past eclipses exist. Users want to step **forward and backward** through eclipses, including history.

Outcome: users can step through every solar and lunar eclipse from 2001 to 2100 with arrows, keyboard and swipe; jump by year; filter Solar / Lunar / All; and return to the live "next eclipse" view at any time. Past, in-progress and far-future eclipses each have their own presentation.

## Decisions (from the interview)
| Topic | Decision |
|---|---|
| Range | Whole NASA catalog, **2001–2100** (~450 eclipses), fixed window that doesn't drift with rebuilds |
| Sequence | **Solar \| Lunar \| All** 3-way toggle. Arrows step within the active filter; All interleaves both chronologically |
| Default | Solar. `?type=solar\|lunar\|all` in the URL |
| Browsed eclipse in URL | **No.** Browsing is ephemeral; reload returns to the live view |
| Fast travel | Prev/next arrows + **year picker** (native `<select>`, 2001–2100) |
| Placement | Arrows **flank the headline date**; the date's year is the tappable year picker. Mobile uses a short date (`Sat 20 Feb 2027`) so it fits on one line |
| Return home | "Back to next" pill (only while browsing) **and** re-tapping the active toggle option, and the Brand click |
| Type switch while browsing | Land on the **nearest-in-time** eclipse of the new filter |
| Countdown, future ≤ 365 d | Live D/H/M/S tiles counting to that eclipse |
| Countdown, future > 365 d | Static line: "In 73 years from now" |
| Countdown, in progress | "Happening now" state, with time until it ends |
| Countdown, past | Static line: "Happened 18 years ago" |
| Past copy | Description and location message switch to **past tense** |
| Shortcuts | ←/→ keys (desktop); horizontal swipe on the headline/countdown block (mobile) |
| Rapid stepping | Prefetch geometry for ±1 neighbours; keep the previous overlay drawn until the new one loads, then swap and fly |
| Lunar geo size | **Compact string encoding** for the grid (~10× smaller) |
| Index loading | Keep static import (~15 KB gzipped) |
| "Now" window | Lunar: from the catalog's penumbral duration. Solar: fixed peak ± 2.5 h |
| Delivery | **Three PRs:** data → state/hooks → UI |

## Domain terms
- **Filter**: `'solar' | 'lunar' | 'all'` (new `EclipseFilter`; `EclipseType` stays `'solar' | 'lunar'`).
- **Timeline**: all eclipses matching the filter, ascending by `peakUtc`.
- **Live**: no eclipse is pinned; the view follows the first eclipse whose `endUtc` is after now. It rolls over by itself.
- **Pinned**: the user has stepped or jumped; the view stays on that eclipse id even as time passes.
- **Phase** of an eclipse relative to now: `upcoming` (now < start), `now` (start ≤ now < end), `past` (now ≥ end).

## PR 1 — Data pipeline (no visible UI change)
**Files:** `scripts/build-eclipse-data.ts`, `src/data/types.ts`, `src/data/repository.ts`, `src/data/eclipses.json`, `src/data/geo/*`, `src/data/repository.test.ts`.

1. **Fixed window**: replace `now → now + WINDOW_YEARS` with `2001-01-01T00:00Z → 2101-01-01T00:00Z`. `window` in the index records these bounds. `generatedAt` stays.
2. **Path pages**: the `SEpath/SEpath2001/…` URL pattern must resolve for every central eclipse 2001–2100 (T, A, H). Log and fail the build on any 404 instead of silently writing `hasGeometry: false`. Partial solar eclipses keep `hasGeometry: false`.
3. **Event window**: add `startUtc` and `endUtc` (ISO, trailing `Z`) to `EclipseSummary`.
   - Lunar: peak ± penumbral duration / 2, parsed from the LE catalog duration columns.
   - Solar: peak ± 2.5 h (approximation; comment it in the script).
4. **Compact lunar grid**: replace `points: [lat, lon, zone][]` on disk with
   `grid: { step, zones, origin: [-90, -180], cells: string }`: one character per cell, row-major from south-west, lat rows `-90..90`, lon columns `-180..<180`, `'0'` = not visible, otherwise the zone code. Decode in `JsonEclipseRepository.getGeometry` back to the existing `LunarGeometry.grid.points` shape, so `globe/*`, `describe.ts` and `visibility.ts` don't change. Expected size ~7 KB per lunar file.
5. **`schemaVersion: 2`** for the index and geo files. The repository rejects (throws on) a version it doesn't know.
6. **Repository**: add `getAll(): Promise<EclipseSummary[]>` (sorted ascending). Keep `getUpcoming`. Add an in-memory `Map<id, Promise<EclipseGeometry | null>>` cache to `getGeometry` so prefetching and revisits are free.
7. **Tests**: index covers 2001–2100 and is sorted with unique ids; every central solar eclipse has geometry; every eclipse has `startUtc < peakUtc < endUtc`; the encoding round-trips (encode → decode equals the original points for a sample eclipse); the geometry cache returns the same promise for the same id.

## PR 2 — State and hooks (no visible UI change)
**Files:** new `src/hooks/timeline.ts` + `timeline.test.ts`, new `src/hooks/useEclipseBrowser.ts`, `src/hooks/useEclipseGeometry.ts`, `src/data/types.ts`.

Pure functions in `timeline.ts` (all take `nowMs` explicitly):
- `filterTimeline(all, filter)` → ascending list.
- `liveIndex(list, nowMs)` → index of the first eclipse with `endUtc > nowMs`, or `-1`.
- `phaseOf(eclipse, nowMs)` → `'upcoming' | 'now' | 'past'`.
- `nearestIndex(list, peakMs)` → closest by `|peak - peakMs|`; a tie goes to the later one.
- `firstIndexInYear(list, year)` → first eclipse whose **local** peak year is `year`, or `-1`.
- `yearsWithEclipses(list)` → `Set<number>` of local years (to disable empty years in the picker).

`useEclipseBrowser(filter, repo)` replaces `useEclipseCountdown` and returns:
```ts
{ eclipse, phase, remaining, isLive, loading,
  canPrev, canNext, prev(), next(), jumpToYear(y), reset(), years }
```
- State: `pinnedId: string | null` (`null` = live) plus the existing 1 s tick.
- `prev`/`next` from live start at the live index. They pin the result. They're no-ops at the ends (no wrap).
- When the filter changes: if live, stay live. If pinned, re-pin to `nearestIndex` in the new list (switching to All keeps the same id because it is in the list).
- `reset()` sets `pinnedId = null`.
- Stepping onto the live eclipse still pins it. `isLive` is true only when `pinnedId === null`, so the "Back to next" pill hides only after an explicit reset or toggle re-tap. Rationale: pinned eclipses never move under the user.
- `remaining` is computed against `startUtc` when `upcoming`, against `endUtc` when `now`, and is `null` when `past`.

`useEclipseGeometry(id)` gains `displayGeometry`: the last geometry that finished loading (any id), next to the existing `geometry` (only for the current id). It also prefetches the geometry for the ±1 neighbour ids (passed in) through the repository cache.
- Globe uses `displayGeometry` (keeps the old overlay during loads).
- Description and location check keep using `geometry` (never stale data against the wrong eclipse).

Tests: every timeline function, including the edges (empty list, before the first, after the last, ties, local vs UTC year boundary on 31 Dec / 1 Jan); browser state transitions (live rollover, pinned stays put, filter switch re-pins to nearest, ends disable prev/next) with fake timers.

## PR 3 — UI
**Files:** `src/App.tsx`, `src/components/EclipseTypeToggle.tsx`, `EclipseHeadline.tsx`, `Countdown.tsx`, `YourLocation.tsx`, `EclipseGlobe.tsx`, `Brand.tsx`, `format.ts` (+ test), `src/globe/describe.ts` (+ test).

**Toggle**: Solar | Lunar | All. `readTypeFromUrl`/`writeTypeToUrl` accept `all`. Clicking the already-selected option calls `reset()`.

**Headline** (`EclipseHeadline`):
- `‹  date  ›` with `IconButton`s, `aria-label="Previous eclipse"` / `"Next eclipse"`, `title` set to the target's date, disabled at the ends.
- The year in the date is a native `<select>` (2001–2100) styled to look like the text. Years with no eclipse in the filter are `disabled`. Changing it calls `jumpToYear`. `aria-label="Jump to year"`.
- Mobile date: new `formatShortDate` → `Sat 20 Feb 2027`. Desktop keeps `formatHeadlineDate`.
- Eyebrow gets the eclipse's own type (under All, a lunar dot or solar dot per eclipse).
- "Back to next eclipse" pill sits beside the eyebrow (desktop) or above the headline (mobile). It shows only when `!isLive` and calls `reset()`. Brand click also calls `reset()`.

**Countdown** renders by phase:
- `upcoming` and ≤ 365 days: existing tiles; aria-label "Time until this {type} eclipse" when pinned.
- `upcoming` and > 365 days: static "In {n} years from now" (largest whole unit, e.g. "In 2 years from now"; built with a plain template, since `Intl.RelativeTimeFormat` can't add "from now").
- `now`: "Happening now", plus "ends in 1 h 12 min".
- `past`: "Happened {n} years ago" (largest whole unit: years, months or days).
- The existing "No upcoming … eclipse" message stays for live mode after 2100.

**Copy tense**: `describeVisibility(eclipse, geometry, tense)` with `tense: 'past' | 'present' | 'future'` derived from the phase ("Europe and Africa got the full show" / "…are getting…" / "…get…"). `YourLocation` `MESSAGES` gains past and present variants. Check every message pair in tests.

**Type plumbing under All**: anything that today takes the filter must take `eclipse.type`: `useMyLocation`, `Countdown`, `EclipseGlobe` (use the type of the geometry being displayed, since `displayGeometry` can lag one step behind).

**Shortcuts**:
- `keydown` on `window`: `ArrowLeft` → prev, `ArrowRight` → next. Ignore with any modifier key, or when the target is an input, select, textarea or contenteditable element.
- Mobile swipe on the headline + countdown stack only (not the globe, not the sheet): pointer events, `touch-action: pan-y`, horizontal |dx| ≥ 50 px and |dx| > 1.5·|dy|. Swiping left goes to the next (later) eclipse.

**Globe**: draws `displayGeometry`; flies the camera (1200 ms, or 0 when `prefers-reduced-motion`) only when a new geometry lands, so rapid steps don't queue half-flights.

## Edge cases
- First and last eclipse in the catalog: arrows disabled, keys and swipes are no-ops.
- A lunar year with no eclipses: its option is disabled in the picker.
- The local year differs from the UTC year near New Year: the picker and `firstIndexInYear` both use the local date shown in the headline.
- A pinned eclipse that changes phase while viewed (upcoming → now → past): the countdown and copy update live; the view doesn't move.
- Partial solar eclipses (no geometry): the existing "no mapped zone" message. These are now common, about a third of solar eclipses.
- Live mode during the "now" window: the view stays on the in-progress eclipse until `endUtc`, then rolls over (changes today's peak-instant rollover).
- Geometry for a stale step arrives late: the cache keeps it, but `geometry` (id-matched) ignores it for description and location.
- WebGL is unavailable: the existing fallback. Browsing still works.
- ΔT uncertainty makes far-future times accurate to about a minute only. Add a footnote line: "Times beyond 2030 are predictions."

## Out of scope
Deep links to a specific eclipse, a timeline scrubber, search, partial-solar visibility zones, eclipses outside 2001–2100.

## Verification
- `pnpm test` (each PR) and `pnpm build`.
- PR 1: `pnpm data:build`. Check the eclipse count (~224 solar + ~228 lunar), that `src/data/geo` is about 2–3 MB in total, and that the app still shows the same next eclipse.
- PR 3, in the browser preview (desktop 1440×900 and mobile 390×844):
  - step prev/next through the filters
  - jump to 2001 and 2100 and check that the arrows disable
  - switch Solar → Lunar mid-history and check you land nearest in time
  - check "Back to next", the toggle re-tap and the Brand reset
  - check ←/→ keys and swipe on mobile
  - check the past / far-future / within-a-year countdown variants
  - check "Happening now" by stubbing `Date.now`
  - click quickly and check the globe overlay doesn't blank and the camera doesn't jitter
  - check the console has no errors.

## Changes during implementation
- **Non-central solar eclipses** (2014-04-29, 2043-04-09, 2043-10-03): NASA has no path for them, since the shadow only grazes a pole. They are mapped like partial eclipses (`hasGeometry: false`) and get their own description line. The fail-on-missing-path check now skips them on purpose.
- **Browsing behaviour is tested through pure functions** (`timeline.ts`, `swipeDirection`, `locationMessage`) rather than by rendering the hook with fake timers. The repo has no React testing library, and the hook only wires those functions together.
- **"Back to next eclipse" pill on desktop** sits beside the toggle, not beside the eyebrow. Beside the eyebrow it made long eyebrows wrap ("PARTIAL SOLAR ECLIPSE · SAROS / 156").
- **Screen-reader announcements** come from a visually hidden live region holding the eclipse kind and full date. The visible date contains the year `<select>`, whose 100 options would otherwise be read out on every step.
- **Footnote** reads "those after 2030 are predictions and may shift by a minute or so", rather than the shorter wording above.

