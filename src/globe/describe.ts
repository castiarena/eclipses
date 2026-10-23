import type { EclipseGeometry, EclipseKind, EclipseType } from '../data/types'

/** Rough lat/lng boxes, only good enough for a one-line summary. */
interface Region {
  name: string
  box: [latMin: number, latMax: number, lngMin: number, lngMax: number]
}

const REGIONS: Region[] = [
  { name: 'North America', box: [15, 70, -168, -55] },
  { name: 'South America', box: [-55, 12, -81, -35] },
  { name: 'Europe', box: [36, 70, -10, 40] },
  { name: 'Africa', box: [-34, 36, -17, 51] },
  { name: 'Asia', box: [5, 75, 45, 145] },
  { name: 'Australia', box: [-43, -11, 113, 153] },
  { name: 'Antarctica', box: [-90, -63, -180, 180] },
]

/** Share of a region's grid cells that must see the whole lunar eclipse to name it. */
const LUNAR_FULL_SHARE = 0.6

const inBox = ([latMin, latMax, lngMin, lngMax]: Region['box'], lat: number, lng: number) =>
  lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax

/** Joins region names, merging both Americas, e.g. "the Americas, Europe and Africa". */
function joinRegions(names: string[]): string {
  const merged = names.includes('North America') && names.includes('South America')
    ? names.flatMap((n) => (n === 'North America' ? ['the Americas'] : n === 'South America' ? [] : [n]))
    : names
  return new Intl.ListFormat('en-GB', { type: 'conjunction' }).format(merged)
}

const isPlural = (names: string[]) => names.length > 1

/** Regions where at least LUNAR_FULL_SHARE of the grid sees the whole eclipse. */
function lunarFullRegions(grid: NonNullable<EclipseGeometry['grid']>): string[] {
  const full = new Set(grid.points.filter(([, , z]) => z === 2).map(([lat, lng]) => `${lat},${lng}`))
  // Antarctica is skipped: almost nobody is there to watch the Moon.
  return REGIONS.filter(({ name }) => name !== 'Antarctica').filter(({ box }) => {
    let total = 0
    let hits = 0
    for (let lat = Math.ceil(box[0] / grid.step) * grid.step; lat <= box[1]; lat += grid.step) {
      for (let lng = Math.ceil(box[2] / grid.step) * grid.step; lng <= box[3]; lng += grid.step) {
        total++
        if (full.has(`${lat},${lng}`)) hits++
      }
    }
    return total > 0 && hits / total >= LUNAR_FULL_SHARE
  }).map((r) => r.name)
}

/** Regions the solar centre line passes over. */
function solarPathRegions(geometry: EclipseGeometry): string[] {
  const line = geometry.features?.features.find((f) => f.properties.zone === 'centerline')
  if (!line || line.geometry.type !== 'LineString') return []
  const coords = line.geometry.coordinates as number[][]
  return REGIONS.filter(({ box }) => coords.some(([lng, lat]) => inBox(box, lat, lng))).map((r) => r.name)
}

const CENTRAL_NOUN: Partial<Record<EclipseKind, string>> = {
  total: 'totality',
  annular: 'annularity',
  hybrid: 'the central shadow',
}

/** Whether the eclipse is ahead, happening, or over; picks the sentence's tense. */
export type Tense = 'future' | 'present' | 'past'

// Future and present share the simple present ("crosses"); only lunar copy needs "now".
const COPY = {
  lunarBase: {
    future: 'Visible from anywhere the Moon is above the horizon',
    present: 'Visible now from anywhere the Moon is above the horizon',
    past: 'Was visible from anywhere the Moon was above the horizon',
  },
  fullShow: {
    future: (plural: boolean) => (plural ? 'get' : 'gets'),
    present: (plural: boolean) => (plural ? 'are getting' : 'is getting'),
    past: () => 'got',
  },
  partial: {
    future: 'A partial eclipse: the Moon covers part of the Sun as seen from a wide area. The exact zone is not mapped yet.',
    present: 'A partial eclipse: the Moon covers part of the Sun as seen from a wide area. The exact zone is not mapped yet.',
    past: 'A partial eclipse: the Moon covered part of the Sun as seen from a wide area. The exact zone is not mapped.',
  },
  nonCentral: {
    future: "The Moon's central shadow only grazes the Earth near a pole, so no path is mapped; a wider area sees a partial eclipse.",
    present: "The Moon's central shadow only grazes the Earth near a pole, so no path is mapped; a wider area sees a partial eclipse.",
    past: "The Moon's central shadow only grazed the Earth near a pole, so no path is mapped; a wider area saw a partial eclipse.",
  },
  ocean: {
    future: (noun: string) => `The path of ${noun} stays over open ocean; nearby coasts see a partial eclipse.`,
    present: (noun: string) => `The path of ${noun} stays over open ocean; nearby coasts see a partial eclipse.`,
    past: (noun: string) => `The path of ${noun} stayed over open ocean; nearby coasts saw a partial eclipse.`,
  },
  land: {
    future: (noun: string, list: string) => `The path of ${noun} crosses ${list}; a much wider area sees a partial eclipse.`,
    present: (noun: string, list: string) => `The path of ${noun} crosses ${list}; a much wider area sees a partial eclipse.`,
    past: (noun: string, list: string) => `The path of ${noun} crossed ${list}; a much wider area saw a partial eclipse.`,
  },
} as const

/** One sentence on where an eclipse can be seen, built from its stored geometry. */
export function describeVisibility(
  eclipse: { type: EclipseType; kind: EclipseKind },
  geometry: EclipseGeometry | null,
  tense: Tense = 'future',
): string {
  if (eclipse.type === 'lunar') {
    const base = COPY.lunarBase[tense]
    const regions = geometry?.grid ? lunarFullRegions(geometry.grid) : []
    if (!regions.length) return `${base}.`
    const list = joinRegions(regions)
    // "The Americas" is plural even when it is the only item.
    const verb = COPY.fullShow[tense](isPlural(regions) || list === 'the Americas')
    return `${base} — ${list} ${verb} the full show.`
  }

  const noun = CENTRAL_NOUN[eclipse.kind]
  if (!noun) return COPY.partial[tense]
  // Non-central eclipse: the shadow only grazes a polar edge, so NASA maps no path.
  if (!geometry?.features) return COPY.nonCentral[tense]
  const regions = solarPathRegions(geometry)
  if (!regions.length) return COPY.ocean[tense](noun)
  return COPY.land[tense](noun, joinRegions(regions))
}
