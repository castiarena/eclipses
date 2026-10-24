// Draws the 1200x630 link-preview card for every eclipse into dist/og/<id>.png, plus default.png for the
// home page. Run after `vite build`; part of `pnpm build`.

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import { formatDuration, formatHeadlineDate, formatMagnitude } from '../src/components/format.ts'
import type { EclipseSummary } from '../src/data/types.ts'
import { eclipseName, OG_IMAGE_SIZE, SITE_NAME } from '../src/share/meta.ts'
import { DIST, ORIGIN, BASE, ROOT, readEclipses } from './site.mts'

const fontFile = (pkg: string, file: string) => readFile(join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file))
const fonts = [
  { name: 'Sora', data: await fontFile('sora', 'sora-latin-400-normal.woff'), weight: 400 as const },
  { name: 'Sora', data: await fontFile('sora', 'sora-latin-700-normal.woff'), weight: 700 as const },
  { name: 'JetBrains Mono', data: await fontFile('jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'), weight: 400 as const },
]

// Satori takes React-like element trees; this builds them without JSX.
type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown } }
const el = (style: Record<string, unknown>, children?: unknown): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
})

// Same hues as src/globe/palette.ts.
const TONE = {
  solar: { dot: '#f5c84c', glow: 'rgba(245, 200, 76, 0.55)' },
  lunar: { dot: '#b8a6ff', glow: 'rgba(124, 92, 255, 0.55)' },
}

/** A disc with a glowing rim: the Sun with the Moon across it (solar), or the Moon in shadow (lunar). */
function disc(type: 'solar' | 'lunar'): Node {
  const { dot, glow } = TONE[type]
  const size = 320
  const body =
    type === 'solar'
      ? el({ width: size, height: size, borderRadius: size, background: '#05060b', border: `4px solid ${dot}` })
      : el({
          width: size,
          height: size,
          borderRadius: size,
          background: 'radial-gradient(circle at 70% 35%, #8f7bff 0%, #4a3a9c 55%, #1d1650 100%)',
        })
  // The glow is a gradient behind the disc: a blurred box-shadow made each card take over a second to draw.
  return el(
    { width: 420, height: 420, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 420, background: `radial-gradient(circle, ${glow} 0%, ${glow} 38%, rgba(5, 6, 11, 0) 70%)` },
    body,
  )
}

function card(opts: { eyebrow: string; weekday: string; date: string; facts: string; type: 'solar' | 'lunar' }): Node {
  const { dot } = TONE[opts.type]
  return el(
    {
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      boxSizing: 'border-box',
      padding: '64px 72px',
      background: 'linear-gradient(135deg, #05060b 0%, #0b0d16 100%)',
      color: 'white',
      fontFamily: 'Sora',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    [
      el({ flexDirection: 'column', justifyContent: 'space-between', alignSelf: 'stretch', width: 650, flexShrink: 0 }, [
        el({ alignItems: 'center', fontFamily: 'JetBrains Mono', fontSize: 24, letterSpacing: 3, color: 'rgba(255,255,255,0.8)' }, [
          el({ width: 14, height: 14, borderRadius: 14, background: dot, marginRight: 16 }),
          opts.eyebrow.toUpperCase(),
        ]),
        el({ flexDirection: 'column' }, [
          el({ fontSize: 34, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }, opts.weekday),
          el({ fontSize: 76, fontWeight: 700, lineHeight: 1.05 }, opts.date),
          el({ fontFamily: 'JetBrains Mono', fontSize: 26, color: 'rgba(255,255,255,0.7)', marginTop: 28 }, opts.facts),
        ]),
        el({ fontSize: 28, fontWeight: 700, color: dot }, SITE_NAME),
      ]),
      disc(opts.type),
    ],
  )
}

async function render(node: Node): Promise<Buffer> {
  const svg = await satori(node as never, { ...OG_IMAGE_SIZE, fonts })
  return new Resvg(svg, { fitTo: { mode: 'width', value: OG_IMAGE_SIZE.width } }).render().asPng()
}

function eclipseCard(e: EclipseSummary): Node {
  // "Wednesday, 12 August 2026" -> weekday over "12 August 2026".
  const [weekday, date] = formatHeadlineDate(e.peakUtc, 'UTC').split(', ')
  const duration = formatDuration(e.durationSec)
  return card({
    eyebrow: `${eclipseName(e)} · Saros ${e.saros}`,
    weekday,
    date,
    facts: [`Magnitude ${formatMagnitude(e.magnitude)}`, duration && `Up to ${duration}`].filter(Boolean).join(' · '),
    type: e.type,
  })
}

const dir = join(DIST, 'og')
await mkdir(dir, { recursive: true })
const eclipses = await readEclipses()

await writeFile(
  join(dir, 'default.png'),
  await render(card({ eyebrow: 'Solar and lunar eclipses', weekday: 'Countdown and 3D globe', date: 'Next eclipse', facts: 'Where each one can be seen', type: 'solar' })),
)
for (const e of (process.env.OG_ONLY ? eclipses.filter((x) => x.id === process.env.OG_ONLY) : eclipses)) await writeFile(join(dir, `${e.id}.png`), await render(eclipseCard(e)))

console.log(`og images: ${eclipses.length + 1} cards in dist/og (origin ${ORIGIN}, base ${BASE})`)
