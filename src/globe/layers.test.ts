import { describe, expect, it } from 'vitest'
import { JsonEclipseRepository } from '../data/repository'
import type { EclipseGeometry } from '../data/types'
import { buildLayers, centerOf, splitAtAntimeridian } from './layers'

const solarFixture = (ring: number[][], line: number[][]): EclipseGeometry => ({
  id: 'fixture-solar',
  schemaVersion: 1,
  features: {
    type: 'FeatureCollection',
    features: [
      { type: 'Feature', properties: { zone: 'central' }, geometry: { type: 'Polygon', coordinates: [ring] } },
      { type: 'Feature', properties: { zone: 'centerline' }, geometry: { type: 'LineString', coordinates: line } },
    ],
  },
})

describe('splitAtAntimeridian', () => {
  it('keeps a line intact when it does not cross ±180', () => {
    const runs = splitAtAntimeridian([
      [10, 0],
      [20, 5],
      [30, 10],
    ])
    expect(runs).toHaveLength(1)
    expect(runs[0]).toEqual([
      { lat: 0, lng: 10 },
      { lat: 5, lng: 20 },
      { lat: 10, lng: 30 },
    ])
  })

  it('splits a line where its longitude jumps by more than 180°', () => {
    const runs = splitAtAntimeridian([
      [170, 0],
      [178, 1],
      [-178, 2],
      [-170, 3],
    ])
    expect(runs).toHaveLength(2)
    expect(runs[0].map((p) => p.lng)).toEqual([170, 178])
    expect(runs[1].map((p) => p.lng)).toEqual([-178, -170])
  })
})

describe('buildLayers', () => {
  it('solar: draws limits and centerline paths and a fill when there is no antimeridian jump', () => {
    const ring = [
      [10, 10],
      [12, 11],
      [14, 10],
      [12, 9],
      [10, 10],
    ]
    const layers = buildLayers(solarFixture(ring, [[12, 10], [13, 10]]))
    expect(layers.polygons).toHaveLength(1)
    expect(layers.paths.filter((p) => p.zone === 'limits')).toHaveLength(1)
    expect(layers.paths.filter((p) => p.zone === 'centerline')).toHaveLength(1)
  })

  it('solar: omits the fill when the ring crosses the antimeridian', () => {
    const ring = [
      [170, 10],
      [-170, 11],
      [-170, 9],
      [170, 10],
    ]
    const layers = buildLayers(solarFixture(ring, [[175, 10]]))
    expect(layers.polygons).toHaveLength(0)
    expect(layers.paths.some((p) => p.zone === 'limits')).toBe(true)
  })

  it('lunar: maps zone codes to names', () => {
    const layers = buildLayers({
      id: 'fixture-lunar',
      schemaVersion: 1,
      grid: {
        step: 3,
        zones: { 1: 'partial', 2: 'full' },
        points: [
          [0, 0, 1],
          [3, 3, 2],
        ],
      },
    })
    expect(layers.points).toEqual([
      { lat: 0, lng: 0, zone: 'partial' },
      { lat: 3, lng: 3, zone: 'full' },
    ])
  })
})

describe('centerOf', () => {
  it('returns the centerline midpoint for a symmetric solar path', () => {
    const center = centerOf(solarFixture([[0, 0], [1, 0], [0, 0]], [[-10, 0], [10, 0]]))
    expect(center?.lat).toBeCloseTo(0, 5)
    expect(center?.lng).toBeCloseTo(0, 5)
  })

  it('handles paths across the antimeridian', () => {
    const center = centerOf(solarFixture([[0, 0], [1, 0], [0, 0]], [[179, 0], [-179, 0]]))
    expect(Math.abs(center!.lng)).toBeCloseTo(180, 3)
  })

  it('uses the fully-visible lunar zone', () => {
    const center = centerOf({
      id: 'x',
      schemaVersion: 1,
      grid: {
        step: 3,
        zones: { 1: 'partial', 2: 'full' },
        points: [
          [40, 20, 2],
          [42, 22, 2],
          [-60, -150, 1],
        ],
      },
    })
    expect(center!.lat).toBeGreaterThan(30)
    expect(center!.lng).toBeGreaterThan(10)
  })

  it('works on the generated 2027 Feb 06 solar geometry', async () => {
    const repo = new JsonEclipseRepository()
    const geo = await repo.getGeometry('2027-02-06-solar')
    const center = centerOf(geo!)
    // NASA catalog greatest eclipse: 31°S 48°W; the centerline midpoint is close to it.
    expect(center!.lat).toBeLessThan(-20)
    expect(center!.lat).toBeGreaterThan(-45)
  })
})
