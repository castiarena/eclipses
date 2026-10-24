// Writes one HTML page per eclipse (dist/e/<id>/index.html) with its own link-preview tags, because social
// crawlers read the HTML as served and don't run the app. The app boots on those pages as usual and
// shows the eclipse named in the path. Run after `vite build`; part of `pnpm build`.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { t } from '../src/i18n/index.ts'
import { buildMeta, metaTags, ogImagePath } from '../src/share/meta.ts'
import { eclipsePath } from '../src/share/url.ts'
import { BASE, DIST, ORIGIN, readEclipses } from './site.mts'

// index.html holds its default tags between these markers; each page swaps them for its own.
const BLOCK = /[ \t]*<!-- meta:start -->[\s\S]*?<!-- meta:end -->/

const withMeta = (html: string, tags: string) => {
  if (!BLOCK.test(html)) throw new Error('index.html has no <!-- meta:start --> block to replace')
  return html.replace(BLOCK, () => `    <!-- meta:start -->\n${tags}\n    <!-- meta:end -->`)
}

const template = await readFile(join(DIST, 'index.html'), 'utf8')
const eclipses = await readEclipses()

// The home page keeps the default card, now with absolute URLs.
const home = withMeta(
  template,
  metaTags({
    title: t('site.name'),
    description: t('site.description'),
    url: `${ORIGIN}${BASE}`,
    image: `${ORIGIN}${ogImagePath('default', BASE)}`,
    imageAlt: t('meta.defaultImageAlt'),
  }),
)
await writeFile(join(DIST, 'index.html'), home)
// GitHub Pages serves this for unknown paths, so a mistyped link still opens the app.
await writeFile(join(DIST, '404.html'), home)

for (const eclipse of eclipses) {
  const dir = join(DIST, 'e', eclipse.id)
  await mkdir(dir, { recursive: true })
  await writeFile(join(dir, 'index.html'), withMeta(template, metaTags(buildMeta(eclipse, ORIGIN, BASE))))
}

console.log(`prerender: ${eclipses.length} eclipse pages, e.g. ${eclipsePath(eclipses[0].id, BASE)}`)
