# Languages: Spanish first, ready for more

Status: in progress. Part 1 (catalog extraction, English only) and part 2 (Spanish, `/es/` pages, switcher) are built; part 3 (language-neutral OG cards) is proposed.

## Why

The site is English only. Spanish comes first; Portuguese, German, Italian and Chinese are likely next. Each new language should be a translated file, not a code change, and keeping translations complete should cost nothing: no paid service, no manual checks.

## Decisions

- **URLs**: English stays at the root. Every other language gets a prefix, `/es/` and `/es/e/<id>/`, prerendered like the English pages with `<html lang>`, a self-referencing canonical, `hreflang` links to every language (plus `x-default` → English) and `og:locale`. Search results and shared links show the right language.
- **No detection**: the language changes only through the switcher in the footer (the open sheet on phones). URLs stay stable, and crawlers never get redirected.
- **Library**: i18next with react-i18next and ICU messages (`i18next-icu`). Plurals and tense are `{n, plural, …}` and `{tense, select, …}` inside whole sentences, so each language orders its own words. Keys are typed from `en.json`; a typo fails to compile.
- **One instance**: `src/i18n/index.ts` holds the only i18next instance. Components use `useTranslation()`; pure helpers (formatters, `describe.ts`, `meta.ts`) import `t`, so the build scripts and tests format text the same way the app does. English is bundled; other catalogs are lazy chunks loaded before the first render.
- **Dates and numbers**: `Intl` with each locale's own pattern (`LOCALES[…].intl`). English keeps en-GB, so its output did not change. Spanish uses es-419: "lunes, 2 de agosto de 2027", and a decimal point as in most of Latin America.
- **Spanish**: neutral Latin American, informal "tú".
- **Catalog guard** (`src/i18n/i18n.test.ts`): every catalog must have exactly the English keys, valid ICU, the same argument names as English, and no argument names i18next reserves (`lng`, `count`, `ns`, …: they change how i18next looks the message up). It runs in `pnpm test`, so CI blocks an incomplete translation.
- **OG cards**: one set for every language. The localized text lives in the meta tags; the cards will drop their English words (part 3) so the build doesn't grow with each language.

## Adding a language

1. Add a line to `LOCALES` in `src/i18n/locales.ts`: its native name, its `Intl` tag and its Open Graph locale.
2. Copy `src/i18n/locales/en.json` to `<code>.json` and translate the values. Keep the keys, and keep every `{argument}` name as it is; translate the words inside `select` and `plural` branches.
3. Run `pnpm test` (the guard names any missing or broken message) and `pnpm build`.

Chinese and other non-Latin scripts also need a UI font that covers them; the OG cards won't, once they carry no words.

## Notes

- tsx can load `src/i18n/index.ts` twice in the build scripts (as ESM and as CommonJS), so the instance is shared through `globalThis`.
- `404.html` stays English; the app still boots in the path's language.
