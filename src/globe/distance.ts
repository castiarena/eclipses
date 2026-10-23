import type { EclipseGeometry, EclipseSummary } from '../data/types'
import { visibilityAt, type Point } from './visibility'

const EARTH_RADIUS_KM = 6371
const RAD = Math.PI / 180

/** Outside the path but within this distance of its edge counts as "near": a drive, not a flight. */
export const NEAR_PATH_KM = 500

const normLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

/** Great-circle distance in km. */
export function distanceKm(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * RAD
  const dLng = normLon(b.lng - a.lng) * RAD
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Initial compass bearing from `a` towards `b`, in degrees clockwise from north. */
function bearing(a: Point, b: Point): number {
  const dLng = normLon(b.lng - a.lng) * RAD
  const y = Math.sin(dLng) * Math.cos(b.lat * RAD)
  const x = Math.cos(a.lat * RAD) * Math.sin(b.lat * RAD) - Math.sin(a.lat * RAD) * Math.cos(b.lat * RAD) * Math.cos(dLng)
  return (Math.atan2(y, x) / RAD + 360) % 360
}

const COMPASS = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'] as const
export type Compass = (typeof COMPASS)[number]

/** The nearest of the eight compass directions, e.g. 135° → "south-east". */
export function bearingLabel(degrees: number): Compass {
  const i = Math.round((((degrees % 360) + 360) % 360) / 45) % 8
  return COMPASS[i]
}

/** How far, and which way, to go. */
export interface Leg {
  km: number
  direction: Compass
}

/** The point `distance` radians along a great circle from `from`, starting on `heading` degrees. */
function destination(from: Point, heading: number, distance: number): Point {
  const lat1 = from.lat * RAD
  const h = heading * RAD
  const lat2 = Math.asin(Math.sin(lat1) * Math.cos(distance) + Math.cos(lat1) * Math.sin(distance) * Math.cos(h))
  const lng2 =
    from.lng * RAD +
    Math.atan2(Math.sin(h) * Math.sin(distance) * Math.cos(lat1), Math.cos(distance) - Math.sin(lat1) * Math.sin(lat2))
  return { lat: lat2 / RAD, lng: normLon(lng2 / RAD) }
}

/** Nearest point to `p` on the great-circle segment a → b. */
function nearestOnSegment(p: Point, a: Point, b: Point): Point {
  const d13 = distanceKm(a, p) / EARTH_RADIUS_KM
  const d12 = distanceKm(a, b) / EARTH_RADIUS_KM
  if (d12 === 0) return a
  const offCourse = (bearing(a, p) - bearing(a, b)) * RAD
  // Past either end of the segment, the nearest point is that end.
  if (Math.cos(offCourse) <= 0) return a
  const crossTrack = Math.asin(Math.sin(d13) * Math.sin(offCourse))
  const alongTrack = Math.acos(Math.min(1, Math.cos(d13) / Math.cos(crossTrack)))
  return alongTrack >= d12 ? b : destination(a, bearing(a, b), alongTrack)
}

/** Distance and direction from `point` to the nearest point on a line of [lng, lat] coordinates, on the sphere. */
export function distanceToLine(point: Point, coords: number[][]): Leg {
  let best: Point | null = null
  let bestKm = Infinity
  for (let i = 1; i < coords.length; i++) {
    const a = { lng: coords[i - 1][0], lat: coords[i - 1][1] }
    const b = { lng: coords[i][0], lat: coords[i][1] }
    const nearest = nearestOnSegment(point, a, b)
    const km = distanceKm(point, nearest)
    if (km < bestKm) {
      bestKm = km
      best = nearest
    }
  }
  return { km: bestKm, direction: best ? bearingLabel(bearing(point, best)) : 'north' }
}

export type LocationVerdict =
  /** Solar: inside the path of totality or annularity; the centre line, when mapped. */
  | { kind: 'in-path'; toCentre: Leg | null }
  /** Solar: outside the path, within NEAR_PATH_KM of its edge. */
  | { kind: 'near-path'; toPath: Leg }
  /** Solar: farther. A partial eclipse may still be visible; partial zones aren't mapped. */
  | { kind: 'far-from-path'; toPath: Leg }
  /** Lunar: the Moon is up for the whole eclipse, part of it, or none of it. */
  | { kind: 'whole' }
  | { kind: 'part' }
  | { kind: 'not-visible' }
  /** The map can't answer here (e.g. a path across the antimeridian). */
  | { kind: 'unknown' }
  /** There's no visibility map for this eclipse at all. */
  | { kind: 'no-map' }

const featureCoords = (geometry: EclipseGeometry, zone: string): number[][] | null => {
  const f = geometry.features?.features.find((x) => x.properties.zone === zone)
  if (!f) return null
  return f.geometry.type === 'Polygon' ? (f.geometry.coordinates as number[][][])[0] : (f.geometry.coordinates as number[][])
}

/** What the viewer at `point` gets from this eclipse. `geometry` must belong to `eclipse`. */
export function locationVerdict(eclipse: EclipseSummary, geometry: EclipseGeometry | null, point: Point): LocationVerdict {
  if (!eclipse.hasGeometry || !geometry) return { kind: 'no-map' }

  const visibility = visibilityAt(geometry, point)
  if (geometry.grid) {
    return visibility === 'full' ? { kind: 'whole' } : visibility === 'partial' ? { kind: 'part' } : { kind: 'not-visible' }
  }

  const edge = featureCoords(geometry, 'central')
  if (visibility === 'unknown' || !edge) return { kind: 'unknown' }
  if (visibility === 'central') {
    const centre = featureCoords(geometry, 'centerline')
    return { kind: 'in-path', toCentre: centre ? distanceToLine(point, centre) : null }
  }
  const toPath = distanceToLine(point, edge)
  return toPath.km <= NEAR_PATH_KM ? { kind: 'near-path', toPath } : { kind: 'far-from-path', toPath }
}
