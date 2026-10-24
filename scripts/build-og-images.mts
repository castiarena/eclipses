// Draws the 1200x630 link-preview card for every eclipse into dist/og/<id>.png, plus default.png for the
// home page. Run after `vite build`; part of `pnpm build`.
//
// Cards are cached in node_modules/.cache/og under a hash of what they show and of the code, fonts and
// libraries that draw them, so a build only draws the cards that changed. Misses are drawn by up to four
// workers. OG_NO_CACHE=1 draws every card; OG_ONLY=<id> draws the home page's card and that one;
// OG_WORKERS=<n> sets the worker count.

import { createHash } from 'node:crypto'
import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, rm, stat } from 'node:fs/promises'
import { availableParallelism } from 'node:os'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'
import { cardFields, fontPaths } from './og-card.mts'
import type { Job, WorkerInput } from './og-worker.mts'
import { DIST, ORIGIN, BASE, ROOT, readEclipses } from './site.mts'

const started = performance.now()
const outDir = join(DIST, 'og')
const cacheDir = join(ROOT, 'node_modules', '.cache', 'og')
await Promise.all([mkdir(outDir, { recursive: true }), mkdir(cacheDir, { recursive: true })])

// Everything that can change a card's pixels besides its own fields.
const template = createHash('sha256')
const sources = ['scripts/og-card.mts', 'src/share/meta.ts', 'src/components/format.ts'].map((f) => join(ROOT, f))
for (const file of [...sources, ...fontPaths]) template.update(await readFile(file))
for (const pkg of ['satori', '@resvg/resvg-js', 'sharp']) {
  template.update(JSON.parse(await readFile(join(ROOT, 'node_modules', pkg, 'package.json'), 'utf8')).version)
}
const templateVersion = template.digest('hex')
const keyOf = (fields: unknown) => createHash('sha256').update(templateVersion).update(JSON.stringify(fields)).digest('hex').slice(0, 32)

const eclipses = await readEclipses()
const only = process.env.OG_ONLY
const jobs: Job[] = [
  { id: 'default', key: keyOf('default') },
  ...eclipses.filter((e) => !only || e.id === only).map((e) => ({ id: e.id, key: keyOf(cardFields(e)), eclipse: e })),
]

const cached = new Set(process.env.OG_NO_CACHE ? [] : await readdir(cacheDir))
const hits = jobs.filter((j) => cached.has(`${j.key}.png`))
const misses = jobs.filter((j) => !cached.has(`${j.key}.png`))

// A copy-on-write clone where the file system has them, a plain copy elsewhere.
await Promise.all(hits.map((j) => copyFile(join(cacheDir, `${j.key}.png`), join(outDir, `${j.id}.png`), constants.COPYFILE_FICLONE)))

// tsx's loader does not reach worker threads (Node only strips their types, without tsx's import resolution),
// so each worker registers it before loading the card code.
const boot = [
  `import { register } from ${JSON.stringify(import.meta.resolve('tsx/esm/api'))}`,
  'register()',
  `await import(${JSON.stringify(new URL('./og-worker.mts', import.meta.url).href)})`,
].join('\n')
const workerUrl = new URL(`data:text/javascript,${encodeURIComponent(boot)}`)

const workers = Math.min(Number(process.env.OG_WORKERS) || Math.min(availableParallelism(), 4), misses.length)
await Promise.all(
  Array.from({ length: workers }, (_, w) => {
    // Every n-th card, so each worker gets a similar mix.
    const input: WorkerInput = { jobs: misses.filter((_, i) => i % workers === w), outDir, cacheDir }
    const worker = new Worker(workerUrl, { workerData: input })
    return new Promise<void>((resolve, reject) => {
      worker.once('error', reject)
      worker.once('exit', (code) => (code ? reject(new Error(`og worker exited with ${code}`)) : resolve()))
    })
  }),
)

// Keep only this build's cards, so the cache never grows. A partial OG_ONLY build keeps everything.
if (!only) {
  const used = new Set(jobs.map((j) => `${j.key}.png`))
  await Promise.all((await readdir(cacheDir)).filter((f) => !used.has(f)).map((f) => rm(join(cacheDir, f))))
}

let bytes = 0
for (const j of jobs) bytes += (await stat(join(outDir, `${j.id}.png`))).size
const seconds = ((performance.now() - started) / 1000).toFixed(1)
console.log(
  `og images: ${jobs.length} cards (${misses.length} drawn on ${workers} threads, ${hits.length} cached), ` +
    `${(bytes / 1024 / 1024).toFixed(1)} MB, avg ${Math.round(bytes / jobs.length / 1024)} KB, ${seconds}s (origin ${ORIGIN}, base ${BASE})`,
)
