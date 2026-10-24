# eclipses
Eclipse countdown

## Sharing

Every eclipse has its own link, `/e/<id>/` (for example `/eclipses/e/2026-08-12-solar/`), and the share button offers Copy link, WhatsApp, Instagram, Facebook and X. Instagram has no web share link, so it opens the phone's share sheet, or copies the link on desktop.

Link previews come from the HTML, which crawlers read without running the app, so `pnpm build` also:

- draws a 1200×630 card per eclipse into `dist/og/` (`scripts/build-og-images.mts`), and
- writes `dist/e/<id>/index.html` with that eclipse's Open Graph and Twitter tags (`scripts/prerender.mts`).

The site origin defaults to `https://castiarena.github.io`; set `SITE_ORIGIN` to change it, and `BASE_PATH` for the sub-path.

## Languages

English lives at the root and every other language under its code: `/es/`, `/es/e/<id>/`. The language button in the header, beside "Check my location", moves the current page to another language. All text is in `src/i18n/locales/<code>.json` (ICU messages), read through i18next; `en.json` is the source of truth.

To add a language:

1. Add a line to `LOCALES` in `src/i18n/locales.ts`.
2. Copy `src/i18n/locales/en.json` to `<code>.json` and translate the values, keeping keys and `{argument}` names.
3. Run `pnpm test`: it fails on any missing, extra or broken message. Then `pnpm build` prerenders the new pages.

New UI text goes into `en.json` first; the test then lists the key every other catalog is missing. See [the languages spec](docs/specs/2026-10-24-languages.md) for the decisions behind this.
