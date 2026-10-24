# eclipses
Eclipse countdown

## Sharing

Every eclipse has its own link, `/e/<id>/` (for example `/eclipses/e/2026-08-12-solar/`), and the share button offers Copy link, WhatsApp, Instagram, Facebook and X. Instagram has no web share link, so it opens the phone's share sheet, or copies the link on desktop.

Link previews come from the HTML, which crawlers read without running the app, so `pnpm build` also:

- draws a 1200×630 card per eclipse into `dist/og/` (`scripts/build-og-images.mts`), and
- writes `dist/e/<id>/index.html` with that eclipse's Open Graph and Twitter tags (`scripts/prerender.mts`).

The site origin defaults to `https://castiarena.github.io`; set `SITE_ORIGIN` to change it, and `BASE_PATH` for the sub-path.
