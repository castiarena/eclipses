import type { EclipseGeometry } from '../data/types'

export type Visibility =
  | 'central' // solar: inside the path of totality or annularity
  | 'full' // lunar: Moon up for the whole eclipse
  | 'partial' // lunar: Moon up for part of the eclipse
  | 'none' // outside the mapped visibility
  | 'unknown' // the map cannot answer for this point

export interface Point {
  lat: number
  lng: number
}

/** Ray-casting test on the lon/lat plane. Only valid for rings that do not cross the antimeridian. */
export function pointInRing(point: Point, ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = yi > point.lat !== yj > point.lat
    if (crosses && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const normLon = (lon: number) => ((((lon + 180) % 360) + 360) % 360) - 180

/**
 * Whether a point sees the eclipse, from the stored geometry.
 * Lunar lookups snap to the nearest grid point, so they are accurate to about half a grid step.
 */
export function visibilityAt(geometry: EclipseGeometry, point: Point): Visibility {
  if (geometry.grid) {
    const { step, points } = geometry.grid
    const lat = Math.max(-90, Math.min(90, Math.round(point.lat / step) * step))
    const lon = normLon(Math.round(point.lng / step) * step)
    const hit = points.find(([pl, po]) => pl === lat && po === lon)
    if (!hit) return 'none'
    return hit[2] === 2 ? 'full' : 'partial'
  }

  const central = geometry.features.features.find((f) => f.properties.zone === 'central')
  if (!central || central.geometry.type !== 'Polygon') return 'unknown'
  const ring = (central.geometry.coordinates as number[][][])[0]
  const jumps = ring.some((c, i) => i > 0 && Math.abs(c[0] - ring[i - 1][0]) > 180)
  if (jumps) return 'unknown'
  return pointInRing(point, ring) ? 'central' : 'none'
}
