// Writes one HTML page per eclipse and locale (dist/e/<id>/index.html, dist/es/e/<id>/index.html, …) with its
// own link-preview tags and `lang`, because social crawlers and search engines read the HTML as served and
// don't run the app. The app boots on those pages as usual and shows the eclipse named in the path, in the
// path's language. Run after `vite build`; part of `pnpm build`.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { switchLocale, t } from '../src/i18n/index.ts'
import { ALL_LOCALES, DEFAULT_LOCALE, type Locale } from '../src/i18n/locales.ts'
import { buildMeta, metaTags, ogImagePath, type Alternates } from '../src/share/meta.ts'
import { eclipsePath, localeBase } from '../src/share/url.ts'
import { BASE, DIST, ORIGIN, readEclipses } from './site.mts'

// index.html holds its default tags between these markers; each page swaps them for its own.
const BLOCK = /[ \t]*<!-- meta:start -->[\s\S]*?<!-- meta:end -->/
const LANG = /<html lang="[^"]*"/

const page = (html: string, locale: Locale, tags: string) => {
  if (!BLOCK.test(html)) throw new Error('index.html has no <!-- meta:start --> block to replace')
  if (!LANG.test(html)) throw new Error('index.html has no <html lang> to set')
  return html.replace(LANG, `<html lang="${locale}"`).replace(BLOCK, () => `    <!-- meta:start -->\n${tags}\n    <!-- meta:end -->`)
}

/** `path` (relative to a locale's base, e.g. "e/<id>/") in every locale, as absolute URLs. */
const alternates = (path: string) =>
  Object.fromEntries(ALL_LOCALES.map((l) => [l, `${ORIGIN}${localeBase(l, BASE)}${path}`])) as Alternates

const write = async (dir: string, html: string) => {
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'index.html'), html)
}

const template = await readFile(join(DIST, 'index.html'), 'utf8')
const eclipses = await readEclipses()

for (const locale of ALL_LOCALES) {
  await switchLocale(locale)
  const base = localeBase(locale, BASE)
  const root = join(DIST, base.slice(BASE.length))

  // The home page keeps the default card, now with absolute URLs.
  const home = page(
    template,
    locale,
    metaTags(
      {
        title: t('site.name'),
        description: t('site.description'),
        url: `${ORIGIN}${base}`,
        image: `${ORIGIN}${ogImagePath('default', BASE)}`,
        imageAlt: t('meta.defaultImageAlt'),
      },
      alternates(''),
    ),
  )
  await write(root, home)
  // GitHub Pages serves this for unknown paths, so a mistyped link still opens the app.
  if (locale === DEFAULT_LOCALE) await writeFile(join(DIST, '404.html'), home)

  for (const eclipse of eclipses) {
    const path = eclipsePath(eclipse.id, '/').slice(1)
    await write(join(root, path), page(template, locale, metaTags(buildMeta(eclipse, ORIGIN, BASE), alternates(path))))
  }
}

console.log(`prerender: ${eclipses.length} eclipse pages × ${ALL_LOCALES.length} locales, e.g. ${eclipsePath(eclipses[0].id, localeBase(ALL_LOCALES[1] ?? DEFAULT_LOCALE, BASE))}`)
