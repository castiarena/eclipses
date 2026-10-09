# Eclipses

A countdown to the next solar and lunar eclipses, with a 3D globe showing where each one is visible.

Pick **solar** or **lunar** and the page shows a live countdown to the next eclipse of that type, its details (date, kind, magnitude, Saros series, duration when known), and a rotatable Earth with the visibility area drawn on it. The selected type is kept in the URL (`?type=lunar`), so a link opens on the same eclipse.

## Features

- Live countdown (days, hours, minutes, seconds) to the next eclipse, which rolls over to the following one once it has passed.
- Solar and lunar toggle, with light and dark themes that follow the system setting.
- Interactive 3D globe (drag to rotate, scroll to zoom) that moves to the centre of the selected eclipse.
  - **Solar:** the path of totality or annularity, its centre line and limit lines.
  - **Lunar:** grid points coloured by whether the Moon is above the horizon for the whole eclipse or only part of it.
- "Check my location" uses the browser's geolocation, only when you click it, to say whether you are inside the mapped visibility area. The position stays on your device.

## Getting started

Requirements: Node.js and [pnpm](https://pnpm.io). The project uses pnpm only; the lockfile is `pnpm-lock.yaml`.

```sh
pnpm install
pnpm dev        # start the dev server
```

## Scripts

| Command           | What it does                                                       |
| ----------------- | ------------------------------------------------------------------ |
| `pnpm dev`        | Start the Vite dev server                                          |
| `pnpm build`      | Type-check with `tsc`, then build for production                   |
| `pnpm preview`    | Serve the production build locally                                 |
| `pnpm test`       | Run the unit tests once with Vitest                                |
| `pnpm data:build` | Regenerate the eclipse dataset from NASA's catalogs (needs network) |

## Eclipse data

The eclipse list and visibility geometry are generated files, committed to the repository:

- `src/data/eclipses.json`: index of the next 10 years of eclipses, without geometry.
- `src/data/geo/<id>.json`: visibility geometry for one eclipse, loaded when it is selected.

Regenerate them with `pnpm data:build`. The script reads NASA GSFC's Five Millennium Canon of Solar and Lunar Eclipses (Espenak & Meeus) and the solar path pages. Do not edit the generated files by hand.

The UI reads eclipses through the `EclipseRepository` interface in `src/data/repository.ts`. The current implementation reads the static JSON; an API or database could replace it without touching the components.

## Project layout

```
scripts/build-eclipse-data.ts   Generates src/data/eclipses.json and src/data/geo/
src/data/                       Types, repository interface and JSON implementation, generated data
src/hooks/                      Countdown logic and geometry loading
src/globe/                      Globe layers and point-visibility checks
src/components/                 Countdown, eclipse details, type toggle, globe, location check
public/                         Logos and the Earth texture (NASA Blue Marble)
docs/PLAN.md                    Design decisions and the phase-by-phase build log
```

## Known limits

- Solar partial eclipses have no map; the app says so.
- Solar paths that cross the antimeridian show their limit and centre lines, but no filled area, and the location check reports "unknown" for them.
- Lunar full and partial zones are approximations computed from catalog data, not exact visibility maps.
- The globe rendering and the phone layout have been checked in a headless browser only; drag, zoom and the location prompt have not been tested interactively.

## Data sources and credits

- Eclipse catalogs and paths: NASA GSFC, Five Millennium Canon of Solar and Lunar Eclipses (Espenak & Meeus).
- Earth texture: NASA Blue Marble, served locally.
- Globe: [react-globe.gl](https://github.com/vasturiano/react-globe.gl) on [three.js](https://threejs.org).

## More detail

- [`docs/PLAN.md`](docs/PLAN.md) explains the architecture decisions, the data model and the status of each build phase.
- [`AGENTS.md`](AGENTS.md) has the conventions for AI coding agents working in this repository.

## License

MIT. See the `license` field in `package.json`.
