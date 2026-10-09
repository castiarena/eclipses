import type { EclipseGeometry, GeoFeature } from '../data/types'

export interface GlobePoint {
  lat: number
  lng: number
}

export interface GlobeLayers {
  /** Lunar grid points, colored by zone. */
  points: (GlobePoint & { zone: 'full' | 'partial' })[]
  /** Each entry is one continuous line, drawn as a path. */
  paths: { zone: 'limits' | 'centerline'; points: GlobePoint[] }[]
  /** Solar central-path fill. Only present when the path does not cross the antimeridian. */
  polygons: { zone: 'central'; geometry: { type: 'Polygon'; coordinates: number[][][] } }[]
}

const LUNAR_ZONE: Record<number, 'full' | 'partial'> = { 1: 'partial', 2: 'full' }

/**
 * Splits a [lon, lat] line wherever it jumps more than 180° in longitude, which
 * means it crossed the antimeridian. Without this, the renderer draws a line
 * across the whole globe.
 */
export function splitAtAntimeridian(coords: number[][]): GlobePoint[][] {
  const runs: GlobePoint[][] = []
  let run: GlobePoint[] = []
  coords.forEach(([lon, lat], i) => {
    if (i > 0 && Math.abs(lon - coords[i - 1][0]) > 180) {
      runs.push(run)
      run = []
    }
    run.push({ lat, lng: lon })
  })
  if (run.length) runs.push(run)
  return runs
}

function hasAntimeridianJump(coords: number[][]): boolean {
  return coords.some((c, i) => i > 0 && Math.abs(c[0] - coords[i - 1][0]) > 180)
}

function feature(geometry: EclipseGeometry, zone: string): GeoFeature | undefined {
  return geometry.features?.features.find((f) => f.properties.zone === zone)
}

/** Converts stored geometry into the layers the globe draws. */
export function buildLayers(geometry: EclipseGeometry): GlobeLayers {
  const layers: GlobeLayers = { points: [], paths: [], polygons: [] }

  if (geometry.grid) {
    layers.points = geometry.grid.points.map(([lat, lng, zone]) => ({
      lat,
      lng,
      zone: LUNAR_ZONE[zone],
    }))
    return layers
  }

  const central = feature(geometry, 'central')
  if (central && central.geometry.type === 'Polygon') {
    const ring = (central.geometry.coordinates as number[][][])[0]
    layers.paths.push(...splitAtAntimeridian(ring).map((points) => ({ zone: 'limits' as const, points })))
    if (!hasAntimeridianJump(ring)) {
      layers.polygons.push({ zone: 'central', geometry: { type: 'Polygon', coordinates: [ring] } })
    }
  }

  const line = feature(geometry, 'centerline')
  if (line && line.geometry.type === 'LineString') {
    const coords = line.geometry.coordinates as number[][]
    layers.paths.push(...splitAtAntimeridian(coords).map((points) => ({ zone: 'centerline' as const, points })))
  }

  return layers
}

/**
 * Where to point the camera: the mean position of the eclipse's visible area.
 * Averages unit vectors, so it is correct across the antimeridian.
 * Lunar uses the fully-visible zone, falling back to all points.
 */
export function centerOf(geometry: EclipseGeometry): GlobePoint | null {
  let samples: [number, number][] = []

  if (geometry.grid) {
    const full = geometry.grid.points.filter(([, , z]) => z === 2)
    const source = full.length ? full : geometry.grid.points
    samples = source.map(([lat, lon]) => [lat, lon])
  } else {
    const line = feature(geometry, 'centerline')
    if (line && line.geometry.type === 'LineString') {
      samples = (line.geometry.coordinates as number[][]).map(([lon, lat]) => [lat, lon])
    }
  }

  if (!samples.length) return null

  let x = 0
  let y = 0
  let z = 0
  for (const [lat, lon] of samples) {
    const la = (lat * Math.PI) / 180
    const lo = (lon * Math.PI) / 180
    x += Math.cos(la) * Math.cos(lo)
    y += Math.cos(la) * Math.sin(lo)
    z += Math.sin(la)
  }
  const lat = Math.atan2(z, Math.hypot(x, y)) * (180 / Math.PI)
  const lng = Math.atan2(y, x) * (180 / Math.PI)
  return { lat, lng }
}
