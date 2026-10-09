import { describe, expect, it } from 'vitest'
import { JsonEclipseRepository } from '../data/repository'
import type { EclipseGeometry } from '../data/types'
import { pointInRing, visibilityAt } from './visibility'

const square: number[][] = [
  [0, 0],
  [10, 0],
  [10, 10],
  [0, 10],
  [0, 0],
]

const solarWith = (ring: number[][]): EclipseGeometry => ({
  id: 'x',
  schemaVersion: 1,
  features: {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: { zone: 'central' }, geometry: { type: 'Polygon', coordinates: [ring] } }],
  },
})

describe('pointInRing', () => {
  it('detects points inside and outside a square', () => {
    expect(pointInRing({ lat: 5, lng: 5 }, square)).toBe(true)
    expect(pointInRing({ lat: 15, lng: 5 }, square)).toBe(false)
    expect(pointInRing({ lat: 5, lng: -1 }, square)).toBe(false)
  })
})

describe('visibilityAt: solar', () => {
  it('central inside the path, none outside', () => {
    expect(visibilityAt(solarWith(square), { lat: 5, lng: 5 })).toBe('central')
    expect(visibilityAt(solarWith(square), { lat: 50, lng: 5 })).toBe('none')
  })

  it('unknown when the path crosses the antimeridian', () => {
    const crossing = [
      [170, 0],
      [-170, 0],
      [-170, 10],
      [170, 10],
      [170, 0],
    ]
    expect(visibilityAt(solarWith(crossing), { lat: 5, lng: 175 })).toBe('unknown')
  })

  it('unknown when there is no central polygon', () => {
    const empty: EclipseGeometry = { id: 'y', schemaVersion: 1, features: { type: 'FeatureCollection', features: [] } }
    expect(visibilityAt(empty, { lat: 0, lng: 0 })).toBe('unknown')
  })

  it('agrees with the generated 2027 Feb 06 path', async () => {
    const geo = await new JsonEclipseRepository().getGeometry('2027-02-06-solar')
    // Antarctic coast, close to the catalog's greatest-eclipse point (31°S 48°W)
    expect(visibilityAt(geo!, { lat: -31, lng: -48 })).toBe('central')
    expect(visibilityAt(geo!, { lat: 51.5, lng: -0.1 })).toBe('none')
  })
})

describe('visibilityAt: lunar', () => {
  const lunar: EclipseGeometry = {
    id: 'z',
    schemaVersion: 1,
    grid: {
      step: 3,
      zones: { 1: 'partial', 2: 'full' },
      points: [
        [30, 60, 2],
        [33, 60, 1],
      ],
    },
  }

  it('reads the zone of the nearest grid point', () => {
    expect(visibilityAt(lunar, { lat: 31, lng: 61 })).toBe('full')
    expect(visibilityAt(lunar, { lat: 34, lng: 59 })).toBe('partial')
  })

  it('none where the Moon is not up', () => {
    expect(visibilityAt(lunar, { lat: -40, lng: 0 })).toBe('none')
  })

  it('normalises longitudes at the antimeridian', () => {
    const edge: EclipseGeometry = { id: 'e', schemaVersion: 1, grid: { step: 3, zones: {}, points: [[0, -180, 2]] } }
    expect(visibilityAt(edge, { lat: 0, lng: 179.5 })).toBe('full')
  })
})
