// The 1200x630 link-preview card: layout (satori), raster (resvg) and palette PNG (sharp). No side effects
// beyond reading the fonts, so the build, its workers and the quality test share it.

import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'
import satori from 'satori'
import sharp from 'sharp'
import { formatDuration, formatUtcTime } from '../src/components/format.ts'
import type { EclipseKind, EclipseSummary, EclipseType } from '../src/data/types.ts'
import { OG_IMAGE_SIZE } from '../src/share/meta.ts'
import { ROOT } from './site.mts'

// The card carries no words, so one set serves every language: the date in ISO form, the UTC time, the
// duration, the Saros number (a name in every language) and a disc drawn as the kind looks in the sky.
// Titles and descriptions in each language live in the page's meta tags.

const FONT_FILES = [
  ['Sora', 400, 'sora', 'sora-latin-400-normal.woff'],
  ['Sora', 700, 'sora', 'sora-latin-700-normal.woff'],
  ['JetBrains Mono', 400, 'jetbrains-mono', 'jetbrains-mono-latin-400-normal.woff'],
] as const
export const fontPaths = FONT_FILES.map(([, , pkg, file]) => join(ROOT, 'node_modules', '@fontsource', pkg, 'files', file))
// One array for every call: satori caches parsed fonts by object identity.
const fonts = await Promise.all(
  FONT_FILES.map(async ([name, weight], i) => ({ name, weight, data: await readFile(fontPaths[i]) })),
)

// Satori takes React-like element trees; this builds them without JSX.
type Node = { type: string; props: { style?: Record<string, unknown>; children?: unknown; src?: string; width?: number; height?: number } }
const el = (style: Record<string, unknown>, children?: unknown): Node => ({
  type: 'div',
  props: { style: { display: 'flex', ...style }, children },
})
const svg = (markup: string, size: number): Node => ({
  type: 'img',
  props: { src: `data:image/svg+xml,${encodeURIComponent(markup)}`, width: size, height: size },
})

// Same hues as src/globe/palette.ts.
const TONE = {
  solar: { dot: '#f5c84c', glow: 'rgba(245, 200, 76, 0.55)' },
  lunar: { dot: '#b8a6ff', glow: 'rgba(124, 92, 255, 0.55)' },
}

// The site's mark, as in src/components/Brand.tsx: a ring with a gap. Drawn in the card's own hue: gold on a
// lunar card has too few pixels to get good palette entries.
const mark = (colour: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="12" fill="none" stroke="${colour}" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="56 20" transform="rotate(-30 16 16)"/></svg>`

const STOPWATCH =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.7)" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2.5M10 2h4M12 2v3"/></svg>'

const round = (size: number, style: Record<string, unknown> = {}, child?: Node) =>
  el({ width: size, height: size, borderRadius: size, flexShrink: 0, ...style }, child)

/** What the kind looks like in the sky, so the card names it without words. */
function body(type: EclipseType, kind: EclipseKind, size: number): Node {
  const { dot } = TONE[type]
  const moon = 'radial-gradient(circle at 70% 35%, #8f7bff 0%, #4a3a9c 55%, #1d1650 100%)'
  const shadow = (offset: number, colour: string) =>
    round(size, { position: 'absolute', left: offset, top: -offset / 3, background: colour })
  if (type === 'solar') {
    // Annular: a ring of fire. Partial: the Sun with a bite out of it. Total and hybrid: the Moon covers it all.
    if (kind === 'annular') return round(size, { alignItems: 'center', justifyContent: 'center', background: dot }, round(size * 0.86, { background: '#05060b' }))
    if (kind === 'partial') return round(size, { position: 'relative', overflow: 'hidden', background: dot }, shadow(size * 0.42, '#05060b'))
    return round(size, { background: '#05060b', border: `4px solid ${dot}` })
  }
  // Total: the copper Moon. Partial: Earth's shadow across part of it. Penumbral: the plain Moon, barely dimmed
  // in the sky (a darker shade banded in the palette PNG).
  if (kind === 'total') return round(size, { background: 'radial-gradient(circle at 65% 35%, #c06a42 0%, #8f3a20 55%, #3d1508 100%)' })
  if (kind === 'partial') return round(size, { position: 'relative', overflow: 'hidden', background: moon }, shadow(size * 0.45, 'rgba(10, 8, 30, 0.88)'))
  return round(size, { background: moon })
}

/** The eclipse with a glow behind it. */
function disc(type: EclipseType, kind: EclipseKind, size = 320): Node {
  const { glow } = TONE[type]
  const halo = size * 1.3
  // The glow is a gradient behind the disc: a blurred box-shadow made each card take over a second to draw.
  return el(
    { width: halo, height: halo, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: halo, background: `radial-gradient(circle, ${glow} 0%, ${glow} 38%, rgba(5, 6, 11, 0) 70%)` },
    body(type, kind, size),
  )
}

const frame = (children: Node[], justifyContent = 'space-between'): Node =>
  el(
    {
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      boxSizing: 'border-box',
      padding: '64px 72px',
      background: 'linear-gradient(135deg, #05060b 0%, #0b0d16 100%)',
      color: 'white',
      fontFamily: 'Sora',
      alignItems: 'center',
      justifyContent,
    },
    children,
  )

/** The home page's card: the mark over a solar and a lunar eclipse. */
export const defaultCard = (): Node =>
  frame(
    [
      el({ position: 'absolute', left: 72, top: 64 }, svg(mark(TONE.solar.dot), 56)),
      disc('solar', 'total', 260),
      disc('lunar', 'total', 260),
    ],
    'center',
  )

export function eclipseCard(e: EclipseSummary): Node {
  const { dot } = TONE[e.type]
  const duration = formatDuration(e.durationSec)
  const mono = { fontFamily: 'JetBrains Mono', fontSize: 30, color: 'rgba(255,255,255,0.7)', alignItems: 'center' }
  return frame([
    el({ flexDirection: 'column', justifyContent: 'space-between', alignSelf: 'stretch', width: 650, flexShrink: 0 }, [
      svg(mark(dot), 56),
      el({ flexDirection: 'column' }, [
        el({ alignItems: 'center', ...mono, fontSize: 26, letterSpacing: 3, marginBottom: 20 }, [
          round(14, { background: dot, marginRight: 16 }),
          `SAROS ${e.saros}`,
        ]),
        // "2026-08-12": the one date form every language reads the same.
        el({ fontSize: 96, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2 }, e.peakUtc.slice(0, 10)),
        el({ ...mono, marginTop: 28 }, [
          formatUtcTime(e.peakUtc),
          ...(duration ? [el({ width: 1, height: 28, background: 'rgba(255,255,255,0.3)', margin: '0 24px' }), svg(STOPWATCH, 30), el({ marginLeft: 12 }, duration)] : []),
        ]),
      ]),
      el({ height: 56 }),
    ]),
    disc(e.type, e.kind),
  ])
}

/** The eclipse fields a card shows: when one changes, its card is drawn again. */
export const cardFields = (e: EclipseSummary) => [e.id, e.type, e.kind, e.peakUtc, e.magnitude, e.durationSec, e.saros]

/** Truecolor RGBA pixels of a card. */
export async function renderRaw(node: Node): Promise<Buffer> {
  const svg = await satori(node as never, { ...OG_IMAGE_SIZE, fonts })
  // Satori draws text as paths, so resvg needs no fonts; scanning the system's took ~260 ms a card.
  const image = new Resvg(svg, { font: { loadSystemFonts: false }, fitTo: { mode: 'width', value: OG_IMAGE_SIZE.width } }).render()
  return Buffer.from(image.pixels)
}

export const raw = (pixels: Buffer) => sharp(pixels, { raw: { ...OG_IMAGE_SIZE, channels: 4 } })

/**
 * An 8-bit palette PNG, about a fifth of the truecolor bytes. The quality, not the colour count, sets the size:
 * a card needs few colours, and 99 keeps the glow's gradient and text edges within the quality test's bounds
 * (95 was 12% smaller but left thousands of edge pixels visibly off).
 */
export const encode = (pixels: Buffer): Promise<Buffer> =>
  raw(pixels).png({ palette: true, quality: 99, dither: 1, effort: 7, compressionLevel: 9 }).toBuffer()

export const renderPng = async (node: Node) => encode(await renderRaw(node))
