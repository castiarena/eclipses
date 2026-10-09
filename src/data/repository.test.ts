import { describe, expect, it } from 'vitest'
import eclipsesJson from './eclipses.json'
import { JsonEclipseRepository, selectUpcoming } from './repository'
import type { EclipseIndex, EclipseSummary } from './types'

const eclipse = (
  id: string,
  type: 'solar' | 'lunar',
  peakUtc: string,
  hasGeometry = false,
): EclipseSummary => ({
  id,
  type,
  kind: 'total',
  peakUtc,
  magnitude: 1,
  gamma: 0,
  saros: 1,
  durationSec: null,
  hasGeometry,
})

const fixture: EclipseIndex = {
  schemaVersion: 1,
  generatedAt: '2026-01-01T00:00:00Z',
  window: { from: '2026-01-01T00:00:00Z', to: '2036-01-01T00:00:00Z' },
  source: { catalog: 'test', solar: '', lunar: '' },
  eclipses: [
    eclipse('s-late', 'solar', '2029-06-01T12:00:00Z', true),
    eclipse('l-1', 'lunar', '2027-02-20T23:12:50Z', true),
    eclipse('s-1', 'solar', '2027-02-06T15:59:32Z', false),
    eclipse('s-past', 'solar', '2025-01-01T00:00:00Z', true),
  ],
}

describe('selectUpcoming', () => {
  it('keeps only the requested type and future peaks, earliest first', () => {
    const now = Date.parse('2026-10-08T00:00:00Z')
    const ids = selectUpcoming(fixture.eclipses, 'solar', now).map((e) => e.id)
    expect(ids).toEqual(['s-1', 's-late'])
  })
})

describe('JsonEclipseRepository', () => {
  const repo = new JsonEclipseRepository(fixture)

  it('getUpcoming respects the supplied clock', async () => {
    const list = await repo.getUpcoming('solar', Date.parse('2028-01-01T00:00:00Z'))
    expect(list.map((e) => e.id)).toEqual(['s-late'])
  })

  it('getById finds an eclipse or returns undefined', async () => {
    expect((await repo.getById('l-1'))?.type).toBe('lunar')
    expect(await repo.getById('missing')).toBeUndefined()
  })

  it('getGeometry returns null when the eclipse has no geometry', async () => {
    expect(await repo.getGeometry('s-1')).toBeNull()
    expect(await repo.getGeometry('missing')).toBeNull()
  })
})

describe('generated dataset (src/data/eclipses.json)', () => {
  const index = eclipsesJson as unknown as EclipseIndex
  const repo = new JsonEclipseRepository(index)

  it('has ascending peak times and unique ids', () => {
    const times = index.eclipses.map((e) => Date.parse(e.peakUtc))
    expect(times).toEqual([...times].sort((a, b) => a - b))
    expect(new Set(index.eclipses.map((e) => e.id)).size).toBe(index.eclipses.length)
  })

  it('loads geometry for every eclipse flagged hasGeometry', async () => {
    const flagged = index.eclipses.filter((e) => e.hasGeometry)
    expect(flagged.length).toBeGreaterThan(0)
    for (const e of flagged) {
      const geo = await repo.getGeometry(e.id)
      expect(geo, e.id).not.toBeNull()
      expect(geo?.id).toBe(e.id)
    }
  })

  it('solar geometry has a central polygon and centerline', async () => {
    const geo = await repo.getGeometry('2027-02-06-solar')
    const zones = geo?.features?.features.map((f) => f.properties.zone)
    expect(zones).toEqual(['central', 'centerline'])
  })

  it('lunar geometry is a grid with valid coordinates and zone codes', async () => {
    const geo = await repo.getGeometry('2027-02-20-lunar')
    expect(geo?.grid).toBeDefined()
    for (const [lat, lon, zone] of geo!.grid!.points) {
      expect(lat).toBeGreaterThanOrEqual(-90)
      expect(lat).toBeLessThanOrEqual(90)
      expect(lon).toBeGreaterThanOrEqual(-180)
      expect(lon).toBeLessThanOrEqual(180)
      expect([1, 2]).toContain(zone)
    }
  })
})
