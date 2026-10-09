# Eclipse Countdown — 3D Globe: Implementation Plan

## Context
The repo is a bare Vite + React 18 + TypeScript + Chakra UI scaffold (`src/App.tsx` is "Hello world", `src/Number.tsx` is a placeholder digit box, `src/theme.ts` sets color mode). Goal: a site where users pick **solar** or **lunar**, see a **live countdown** to the next eclipse of that type, and see on a **3D Earth globe** the regions where it is visible. Eclipse data and visibility geometry are stored **locally first** (static JSON), with a path to an updatable DB later.

## Requirements
1. Toggle solar / lunar; selection drives countdown and globe.
2. Countdown (days/hours/min/sec) to the next upcoming eclipse of the chosen type (reuse/replace `Number.tsx` as the digit tile).
3. 3D globe (drag-rotate, zoom) showing visibility area for the selected eclipse.
4. Local data store: eclipse list + visibility geometry, same place, versioned, swappable for a DB later.
5. Light/dark theme (already `system` color mode).

## Architecture decisions
- **Globe:** `react-globe.gl` (three.js wrapper). Supports polygons, paths, points and a day/night texture — covers everything needed with no custom shaders. Lazy-load it (`React.lazy`) to keep initial bundle small.
- **Data access behind a repository interface** (`EclipseRepository.getUpcoming(type)`, `getById`) so the JSON implementation can be replaced by an HTTP/DB one without touching UI.
- **Data source of truth:** NASA GSFC eclipse catalogs (Espenak) — public domain. Solar: path of totality/annularity + partial-visibility region. Lunar: visible wherever the Moon is above the horizon during the event.
- **Precompute geometry offline** via a Node script, commit the output JSON; the browser does no astronomy. (Alternative considered: compute in-browser with astronomy-engine — heavier, unneeded for a fixed list.)

## Data model (`src/data/`)
```ts
type EclipseType = 'solar' | 'lunar'
interface Eclipse {
  id: string                 // e.g. "2026-08-12-solar"
  type: EclipseType
  kind: 'total'|'annular'|'partial'|'hybrid'|'penumbral'
  peakUtc: string            // ISO 8601, drives countdown
  magnitude: number
  durationSec?: number       // max totality/annularity (solar)
  visibility: GeoJSON.FeatureCollection  // see below
}
```
- **Solar visibility:** features tagged `zone: 'central' | 'partial'` — central = path polygon (totality/annularity), partial = broader penumbral-limit polygon. Source: NASA KML/besselian-derived outlines → simplified GeoJSON (~50–200 pts per polygon).
- **Lunar visibility (decided: two zones):** `zone: 'full'` (Moon up for the whole event) and `zone: 'partial'` (Moon rises or sets during the event). Computed from the sub-lunar point at greatest eclipse (lat = Moon declination, lon from GHA) with the event's start/end shifting the hemisphere boundary; `partial` = hemisphere at greatest eclipse minus `full`, expressed as polygons.
- Layout: `src/data/eclipses.json` (index: metadata, no geometry) + `src/data/geo/<id>.json` (geometry, loaded on selection). Include `schemaVersion` and `generatedAt`.

## File plan
```
scripts/build-eclipse-data.ts     # fetch/parse NASA catalog → JSON (run manually, `pnpm data:build`)
src/data/eclipses.json            # generated index
src/data/geo/*.json               # generated geometry
src/data/repository.ts            # EclipseRepository interface + JsonEclipseRepository
src/hooks/useNextEclipse.ts       # picks first eclipse with peakUtc > now for type
src/hooks/useCountdown.ts         # 1s tick, returns {d,h,m,s,done}; rolls to next eclipse when done
src/components/Countdown.tsx      # row of <Number> tiles (adapt src/Number.tsx)
src/components/EclipseTypeToggle.tsx  # Chakra ButtonGroup / Tabs
src/components/EclipseGlobe.tsx   # react-globe.gl; polygons colored by zone; auto-rotate to eclipse center
src/components/EclipseInfo.tsx    # date, kind, magnitude, legend
src/App.tsx                       # compose; selection state in URL (?type=lunar) for shareability
```
New deps: `react-globe.gl`, `three`; dev: `tsx` (run script), `vitest`.

## Phases
0. **Housekeeping** — standardize on pnpm (see Open items).
1. **Data pipeline** — build script; produce next ~10 years of solar + lunar eclipses; validate with a schema check (zod or manual) in the script.
2. **Repository + hooks** — repository, `useNextEclipse`, `useCountdown` (unit-tested with fake timers; test: after `peakUtc` passes it switches to next eclipse).
3. **UI shell** — toggle, countdown, info panel using Chakra; responsive.
4. **Globe** — render Earth texture, visibility polygons, legend, camera `pointOfView` to eclipse center on selection change; fallback message if WebGL unavailable.
5. **Polish** — user-timezone display, "visible from your location?" (optional geolocation point-in-polygon, v2), loading states, bundle check.
6. **Later (out of scope now):** replace `JsonEclipseRepository` with API/DB (e.g. SQLite/Postgres + scheduled refresh job) — same interface.

## Open items / risks
- NASA publishes solar paths as maps/KML tables; parsing effort is the main risk. Fallback: seed 3–5 eclipses by hand/KML conversion first, automate later.
- Globe performance on mobile: keep polygon vertex counts low, cap pixel ratio.
- Times are UTC; countdown must use `Date.now()` vs UTC peak (no local-time parsing bugs).
- Housekeeping (decided: **pnpm**): delete `yarn.lock`, and set `allowBuilds: esbuild: true` in `pnpm-workspace.yaml`. Do this first, before installing new deps.

## Verification
- `pnpm dev`: toggle solar↔lunar → countdown and globe update; polygons sit over the correct regions (spot-check against NASA maps for 2 known eclipses).
- Set system clock / mock `Date` just past an eclipse → UI rolls to the following one.
- `pnpm vitest`: hooks + repository tests; data validation script passes (all `peakUtc` ascending, valid GeoJSON, lon/lat in range).
- `pnpm build` (runs `tsc`) succeeds; check globe chunk is lazy-loaded.
- Test dark/light mode and a narrow mobile viewport.

## Phase 1 status (done)
Run with `pnpm data:build` (`scripts/build-eclipse-data.ts`). Output: `src/data/eclipses.json` (46 eclipses, next 10 years) and `src/data/geo/<id>.json` (37 files).

Deviations from the plan, decided during implementation:
- **Sources:** the NASA catalog tables (`SEcat5/SE2001-2100.html`, `LEcat5/LE2001-2100.html`) and solar path pages (`SEpath/SEpath2001/...`) replace the KML idea, which NASA does not publish at those URLs.
- **Solar partial eclipses:** no geometry (`hasGeometry: false`). The partial-zone polygon is not produced yet.
- **Lunar visibility:** a 3° grid of points, not polygons. Zone 2 = Moon up at both penumbral start and end; zone 1 = up at some point in between. The Moon's sub-lunar point is moved at 14.49°/h from the catalog's zenith. Approximate, but it uses only catalog data.
- **Penumbral lunar eclipses** also get grid geometry, labelled `penumbral` in the index.
- **Solar polygons** use longitudes normalised to [-180, 180]. Paths that cross the antimeridian (or enclose a pole) will need splitting before rendering in Phase 4.

## Phase 2 status (done)
- `src/data/types.ts`, `src/data/repository.ts`: `EclipseRepository` interface and `JsonEclipseRepository`. Geometry is loaded per eclipse with `import.meta.glob`.
- `src/hooks/countdown.ts`: pure helpers `remainingUntil` and `nextEclipseAfter`.
- `src/hooks/useEclipseCountdown.ts`: the hook. Ticks every second and reloads the list when every loaded eclipse has passed.
- Tests: `pnpm test` (Vitest 0.34, the version compatible with Vite 4), 13 passing.

Deviations:
- The hook is `useEclipseCountdown`, not `useNextEclipse` + `useCountdown`. The pure helpers are what get unit-tested. Hook rendering is not tested yet because no Testing Library is installed.
- `tsconfig.json` restricts global types to `vite/client` and excludes `*.test.ts`. Vitest pulls in `@types/node` 26, which TypeScript 4.9 can't parse.

## Phase 3 status (done)
- `src/App.tsx`: solar/lunar state, kept in the URL as `?type=lunar`. Calls `useEclipseCountdown`.
- `src/components/Countdown.tsx`: presentational day/hour/minute/second tiles (replaces the scaffold's `Number.tsx`, which is deleted).
- `src/components/EclipseTypeToggle.tsx`: Chakra button group with `aria-pressed`.
- `src/components/EclipseInfo.tsx`: type, kind, local and UTC time, magnitude, Saros, and duration when known.
- `src/components/format.ts`: formatting helpers, tested in `format.test.ts`.
- `pnpm test`: 18 passing. `tsc` and `vite build` pass.

Not verified: the layout has not been checked in a browser yet (dark mode, a phone-width viewport). That is manual QA to do before Phase 4.

## Phase 4 status (done, not visually verified)
- Dependencies: `react-globe.gl` 2.38, `three` 0.186.
- `public/textures/earth-blue-marble.jpg`: NASA Blue Marble texture, served locally (no CDN at runtime).
- `src/globe/layers.ts`: pure helpers `buildLayers`, `splitAtAntimeridian`, `centerOf`. Tested in `layers.test.ts`.
- `src/components/EclipseGlobe.tsx`: the globe. Solar draws the path fill, limit lines and centre line. Lunar draws grid points coloured by zone. The camera moves to the eclipse's centre. A WebGL fallback message is shown when WebGL is unavailable.
- `src/hooks/useEclipseGeometry.ts`: loads geometry for the current eclipse. Ignores stale responses.
- `App.tsx`: the globe is lazy-loaded (`EclipseGlobe` chunk, ~2 MB, ~557 KB gzipped).

Known limits:
- Solar paths that cross the antimeridian get limit and centre lines but no filled polygon.
- Solar partial eclipses have no map.
- Lunar full/partial zones are approximations (see Phase 1).
- Not yet checked in a browser: rendering, camera movement, and the phone layout. Tests cover the data helpers, not the WebGL component.

## Phase 5 status (done)
- Local time now shows the zone name (`formatLocal` uses explicit `Intl` fields; `dateStyle` cannot be combined with `timeZoneName`).
- "Check my location" (`src/components/YourLocation.tsx`): runs only when the user clicks it, using the browser's geolocation. The position is used on the device only and is not sent anywhere.
- `src/globe/visibility.ts`: `visibilityAt` answers for a point. Solar uses point-in-polygon on the central path. Lunar uses the nearest grid point. Tested in `visibility.test.ts`, including against the real 2027 Feb 06 path.
- Known limits: solar partial visibility is still not mapped, so the message says so. Solar paths that cross the antimeridian answer "unknown".
- Bundle: the build succeeds and the globe chunk stays lazy. The main chunk size was not compared against the previous build.
- Not browser-tested yet, same as Phases 3 and 4.

## Browser check (headless Chrome, `pnpm dev`)
- Desktop 1280px, solar: the countdown, toggle, globe with the path, and details all render.
- Phone 390px (checked in a 390px iframe): fits without horizontal overflow. The countdown labels stay on one line.
- Lunar (`?type=lunar`): renders, with the grid of points and the legend.
- Dark mode: colours switch correctly.
- Fixed during the check: the globe canvas was widening its container on phones (`minW=0` and `overflow=hidden` on the globe box, `minW=0` on the stack); "SECONDS" wrapped on small screens (smaller tile padding on phones).
- Not checked: the "Check my location" permission prompt and the interaction (drag/zoom) of the globe. Headless screenshots cannot test these.
- Note: Chrome enforces a minimum window width, so top-level screenshots at 390px are wider than 390px. Phone checks were done inside a 390px iframe.
