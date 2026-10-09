# AGENTS.md

Guidance for AI coding agents working in this repository. Human-facing overview: [`README.md`](README.md). Design history and phase status: [`docs/PLAN.md`](docs/PLAN.md).

## Stack

React 18 + TypeScript (strict) + Vite 4, Chakra UI for components, react-globe.gl / three.js for the globe, Vitest 0.34 for tests. Vitest 0.34 is pinned on purpose for Vite 4 compatibility; do not upgrade it without checking.

Package manager: **pnpm only**. Do not add `package-lock.json` or `yarn.lock`.

Scripts are defined in `package.json`; treat that file as the source of truth for commands.

## Commands to verify a change

- `pnpm test`: Vitest, runs once.
- `pnpm build`: runs `tsc` then `vite build`. Run it after any type change, because `vite build` alone does not type-check.

Tests live next to the code as `*.test.ts`. `tsconfig.json` excludes test files from the app type-check, so a type error in a test will not fail `pnpm build`. There is no React Testing Library installed; hook and component rendering are not unit-tested. Test the pure helpers instead.

## Generated data: do not hand-edit

- `src/data/eclipses.json` and `src/data/geo/*.json` are produced by `scripts/build-eclipse-data.ts` (`pnpm data:build`). Change the script, then regenerate. Hand edits are lost on the next build.
- Regenerating needs network access to NASA GSFC and rewrites the 10-year window from the current date, so the committed output will change over time. Do not regenerate as a side effect of an unrelated change.

## Time handling

- All eclipse times are UTC ISO 8601 strings with a trailing `Z` (`peakUtc`).
- Compare against `Date.now()` and `Date.parse(...)`. Never parse local-time strings for eclipse times.
- Local-time display goes through the formatters in `src/components/format.ts`; keep that as the only place that formats local time.

## Architecture rules

- UI code reads eclipses only through the `EclipseRepository` interface (`src/data/repository.ts`). Do not import the JSON files directly from components or hooks, so the data source stays replaceable.
- The globe is lazy-loaded (`React.lazy`). Keep three.js and react-globe.gl out of the main bundle; check `pnpm build` output when adding imports to the globe code.
- Pure logic goes in pure modules (`src/hooks/countdown.ts`, `src/globe/layers.ts`, `src/globe/visibility.ts`) so it can be tested without rendering. The hook (`useEclipseCountdown`) is a thin wrapper around them.
- Selected eclipse type lives in the URL query (`?type=lunar`). Preserve that when changing the selection UI.

## Known data limitations (do not "fix" silently)

- Solar partial eclipses have `hasGeometry: false` and no map. The UI says so; do not invent a partial-zone polygon without a data source.
- Lunar visibility is a 3° grid approximation, not a polygon. Its zones are approximate by design.
- Solar polygons use longitudes in [-180, 180]. Paths crossing the antimeridian are not filled; `visibility.ts` returns `unknown` for them. Keep that behaviour unless you also add splitting.
- `src/components/YourLocation.tsx` uses the browser's geolocation only on an explicit click. The position must not leave the device: no network calls, no logging, no analytics.

## Conventions

- Match the style of the file you edit. Most of `src/` uses single quotes and no semicolons; `src/theme.ts` is an exception.
- Use Chakra components for layout and styling.
- Keep changes inside `src/`, `scripts/`, `public/`, or the docs unless the task needs config changes.
- If you change behaviour described in `README.md` or `docs/PLAN.md`, update that document in the same change.

## Reporting

- Before reporting a task done, run `pnpm test` and `pnpm build` and report their actual results.
- Manual browser checks (dark mode, phone width, globe drag) are not automated. Say when you did not run them.
