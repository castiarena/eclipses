import { describe, expect, it } from 'vitest'
import { JsonEclipseRepository } from '../data/repository'
import type { EclipseGeometry, EclipseSummary } from '../data/types'
import { bearingLabel, distanceKm, distanceToLine, locationVerdict } from './distance'

const BUENOS_AIRES = { lat: -34.6037, lng: -58.3816 }
const MONTEVIDEO = { lat: -34.9011, lng: -56.1645 }

const square: number[][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
]

const solar: EclipseGeometry = {
  id: 'x',
  schemaVersion: 1,
  features: {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { zone: 'central' }, geometry: { type: 'Polygon', coordinates: [square] } },
      { type: 'Feature', properties: { zone: 'centerline' }, geometry: { type: 'LineString', coordinates: [[5, -1], [5, 11]] } },
    ],
  },
}

const lunar: EclipseGeometry = {
  id: 'y',
  schemaVersion: 1,
  grid: { step: 3, zones: { '1': 'part', '2': 'whole' }, points: [[0, 0, 2], [0, 3, 1]] },
}

const summary = (type: 'solar' | 'lunar', hasGeometry = true) => ({ type, hasGeometry }) as EclipseSummary

describe('distanceKm', () => {
  it('measures great-circle distance', () => {
    expect(distanceKm(BUENOS_AIRES, MONTEVIDEO)).toBeGreaterThan(200)
    expect(distanceKm(BUENOS_AIRES, MONTEVIDEO)).toBeLessThan(210)
  })
})

describe('bearingLabel', () => {
  it('names the nearest of eight compass directions', () => {
    expect(bearingLabel(0)).toBe('north')
    expect(bearingLabel(350)).toBe('north')
    expect(bearingLabel(135)).toBe('south-east')
    expect(bearingLabel(200)).toBe('south')
    expect(bearingLabel(-90)).toBe('west')
  })
})

describe('distanceToLine', () => {
  it('finds the nearest point on any segment, with its direction', () => {
    const leg = distanceToLine({ lat: 5, lng: 12 }, square)
    // Two degrees of longitude at 5°N.
    expect(leg.km).toBeCloseTo(2 * 111.2 * Math.cos((5 * Math.PI) / 180), -1)
    expect(leg.direction).toBe('west')
  })

  it('handles lines across the antimeridian', () => {
    const leg = distanceToLine({ lat: 0, lng: 179 }, [[-179, -5], [-179, 5]])
    expect(leg.km).toBeCloseTo(222, -1)
    expect(leg.direction).toBe('east')
  })
})

describe('locationVerdict', () => {
  it('inside the path: how far from the centre line', () => {
    const v = locationVerdict(summary('solar'), solar, { lat: 5, lng: 6 })
    expect(v.kind).toBe('in-path')
    expect(v.kind === 'in-path' && v.toCentre.direction).toBe('west')
  })

  it('outside: near within 500 km of the edge, far beyond', () => {
    expect(locationVerdict(summary('solar'), solar, { lat: 5, lng: 12 }).kind).toBe('near-path')
    expect(locationVerdict(summary('solar'), solar, { lat: 5, lng: 30 }).kind).toBe('far-from-path')
  })

  it('lunar: whole, part or not visible from the grid', () => {
    expect(locationVerdict(summary('lunar'), lunar, { lat: 0.5, lng: 0.5 }).kind).toBe('whole')
    expect(locationVerdict(summary('lunar'), lunar, { lat: 0, lng: 3 }).kind).toBe('part')
    expect(locationVerdict(summary('lunar'), lunar, { lat: 40, lng: 40 }).kind).toBe('not-visible')
  })

  it('says so when there is no map', () => {
    expect(locationVerdict(summary('solar', false), null, BUENOS_AIRES).kind).toBe('no-map')
  })

  it('puts Buenos Aires near the 6 Feb 2027 annular path, to the south-east', async () => {
    const geo = await new JsonEclipseRepository().getGeometry('2027-02-06-solar')
    const v = locationVerdict(summary('solar'), geo, BUENOS_AIRES)
    expect(v.kind).toBe('near-path')
    if (v.kind !== 'near-path') return
    expect(v.toPath.km).toBeGreaterThan(50)
    expect(v.toPath.km).toBeLessThan(500)
    expect(['south', 'south-east', 'east']).toContain(v.toPath.direction)
  })
})
