import type { EclipseGeometry, EclipseKind, EclipseType } from '../data/types'
import { intlLocale, t } from '../i18n'

type RegionId = 'northAmerica' | 'southAmerica' | 'europe' | 'africa' | 'asia' | 'australia' | 'antarctica'

/** Rough lat/lng boxes, only good enough for a one-line summary. */
interface Region {
  id: RegionId
  box: [latMin: number, latMax: number, lngMin: number, lngMax: number]
}

const REGIONS: Region[] = [
  { id: 'northAmerica', box: [15, 70, -168, -55] },
  { id: 'southAmerica', box: [-55, 12, -81, -35] },
  { id: 'europe', box: [36, 70, -10, 40] },
  { id: 'africa', box: [-34, 36, -17, 51] },
  { id: 'asia', box: [5, 75, 45, 145] },
  { id: 'australia', box: [-43, -11, 113, 153] },
  { id: 'antarctica', box: [-90, -63, -180, 180] },
]

/** Share of a region's grid cells that must see the whole lunar eclipse to name it. */
const LUNAR_FULL_SHARE = 0.6

const inBox = ([latMin, latMax, lngMin, lngMax]: Region['box'], lat: number, lng: number) =>
  lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax

/**
 * Joins region names, merging both Americas, e.g. "the Americas, Europe and Africa". `places` is how many
 * places the list names, for the verb: "the Americas" counts as two.
 */
function joinRegions(ids: RegionId[]): { list: string; places: number } {
  const both = ids.includes('northAmerica') && ids.includes('southAmerica')
  const keys = both
    ? ids.flatMap((id) => (id === 'northAmerica' ? ['region.americas' as const] : id === 'southAmerica' ? [] : [`region.${id}` as const]))
    : ids.map((id) => `region.${id}` as const)
  const list = new Intl.ListFormat(intlLocale(), { type: 'conjunction' }).format(keys.map((k) => t(k)))
  return { list, places: both ? ids.length : Math.max(ids.length, 1) }
}

/** Regions where at least LUNAR_FULL_SHARE of the grid sees the whole eclipse. */
function lunarFullRegions(grid: NonNullable<EclipseGeometry['grid']>): RegionId[] {
  const full = new Set(grid.points.filter(([, , z]) => z === 2).map(([lat, lng]) => `${lat},${lng}`))
  // Antarctica is skipped: almost nobody is there to watch the Moon.
  return REGIONS.filter(({ id }) => id !== 'antarctica').filter(({ box }) => {
    let total = 0
    let hits = 0
    for (let lat = Math.ceil(box[0] / grid.step) * grid.step; lat <= box[1]; lat += grid.step) {
      for (let lng = Math.ceil(box[2] / grid.step) * grid.step; lng <= box[3]; lng += grid.step) {
        total++
        if (full.has(`${lat},${lng}`)) hits++
      }
    }
    return total > 0 && hits / total >= LUNAR_FULL_SHARE
  }).map((r) => r.id)
}

/** Regions the solar centre line passes over. */
function solarPathRegions(geometry: EclipseGeometry): RegionId[] {
  const line = geometry.features?.features.find((f) => f.properties.zone === 'centerline')
  if (!line || line.geometry.type !== 'LineString') return []
  const coords = line.geometry.coordinates as number[][]
  return REGIONS.filter(({ box }) => coords.some(([lng, lat]) => inBox(box, lat, lng))).map((r) => r.id)
}

const CENTRAL_NOUN = {
  total: 'describe.centralNoun.total',
  annular: 'describe.centralNoun.annular',
  hybrid: 'describe.centralNoun.hybrid',
} as const satisfies Partial<Record<EclipseKind, string>>

/** Whether the eclipse is ahead, happening, or over; picks the sentence's tense. */
export type Tense = 'future' | 'present' | 'past'

/** One sentence on where an eclipse can be seen, built from its stored geometry. */
export function describeVisibility(
  eclipse: { type: EclipseType; kind: EclipseKind },
  geometry: EclipseGeometry | null,
  tense: Tense = 'future',
): string {
  if (eclipse.type === 'lunar') {
    const regions = geometry?.grid ? lunarFullRegions(geometry.grid) : []
    if (!regions.length) return t('describe.lunar', { tense })
    const { list, places } = joinRegions(regions)
    return t('describe.lunarRegions', { tense, regions: list, places })
  }

  const nounKey = CENTRAL_NOUN[eclipse.kind as keyof typeof CENTRAL_NOUN]
  if (!nounKey) return t('describe.partial', { tense })
  // Non-central eclipse: the shadow only grazes a polar edge, so NASA maps no path.
  if (!geometry?.features) return t('describe.nonCentral', { tense })
  const noun = t(nounKey)
  const regions = solarPathRegions(geometry)
  if (!regions.length) return t('describe.ocean', { tense, noun })
  return t('describe.land', { tense, noun, regions: joinRegions(regions).list })
}
