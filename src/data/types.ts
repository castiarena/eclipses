export type EclipseType = 'solar' | 'lunar'

export type EclipseKind = 'total' | 'annular' | 'hybrid' | 'partial' | 'penumbral'

export interface EclipseSummary {
  id: string
  type: EclipseType
  kind: EclipseKind
  /** UTC peak time, ISO 8601 with trailing Z. Drives the countdown. */
  peakUtc: string
  magnitude: number
  gamma: number
  saros: number
  durationSec: number | null
  /** False when no visibility geometry exists for this eclipse (e.g. solar partial). */
  hasGeometry: boolean
}

export interface EclipseIndex {
  schemaVersion: number
  generatedAt: string
  window: { from: string; to: string }
  source: { catalog: string; solar: string; lunar: string }
  eclipses: EclipseSummary[]
}

export interface GeoFeature {
  type: 'Feature'
  properties: { zone: string }
  geometry: { type: 'Polygon' | 'LineString'; coordinates: number[][] | number[][][] }
}

export interface GeoFeatureCollection {
  type: 'FeatureCollection'
  features: GeoFeature[]
}

/** Solar: GeoJSON features tagged by zone ('central' polygon, 'centerline'). */
export interface SolarGeometry {
  id: string
  schemaVersion: number
  features: GeoFeatureCollection
  grid?: undefined
}

/** Lunar: sampled grid. zones maps the numeric zone code to a name. */
export interface LunarGeometry {
  id: string
  schemaVersion: number
  features?: undefined
  grid: {
    step: number
    zones: Record<string, string>
    points: [lat: number, lon: number, zone: number][]
  }
}

export type EclipseGeometry = SolarGeometry | LunarGeometry
