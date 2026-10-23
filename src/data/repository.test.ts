import { describe, expect, it } from 'vitest'
import eclipsesJson from './eclipses.json'
import { encodeGrid } from './grid'
import { JsonEclipseRepository, selectUpcoming } from './repository'
import type { EclipseGeometryFile, EclipseIndex, EclipseSummary } from './types'

const HOUR = 3_600_000
const shift = (iso: string, ms: number) => new Date(Date.parse(iso) + ms).toISOString()

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
  startUtc: shift(peakUtc, -HOUR),
  endUtc: shift(peakUtc, HOUR),
  magnitude: 1,
  gamma: 0,
  saros: 1,
  durationSec: null,
  hasGeometry,
})

const fixture: EclipseIndex = {
  schemaVersion: 2,
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

const lunarFile: EclipseGeometryFile = {
  id: 'l-1',
  schemaVersion: 2,
  grid: encodeGrid([[0, 0, 2], [3, 6, 1]], 3, { 1: 'partial', 2: 'full' }),
}

describe('JsonEclipseRepository', () => {
  let loads = 0
  const loaders = {
    './geo/l-1.json': async () => {
      loads++
      return lunarFile
    },
    './geo/s-late.json': async () => ({ ...lunarFile, id: 's-late', schemaVersion: 1 }),
  }
  const repo = new JsonEclipseRepository(fixture, loaders)

  it('rejects an index with an unknown schema version', () => {
    expect(() => new JsonEclipseRepository({ ...fixture, schemaVersion: 1 })).toThrow(/schema version 1/)
  })

  it('getAll returns every eclipse, earliest first', async () => {
    expect((await repo.getAll()).map((e) => e.id)).toEqual(['s-past', 's-1', 'l-1', 's-late'])
  })

  it('getUpcoming respects the supplied clock', async () => {
    const list = await repo.getUpcoming('solar', Date.parse('2028-01-01T00:00:00Z'))
    expect(list.map((e) => e.id)).toEqual(['s-late'])
  })

  it('getById finds an eclipse or returns undefined', async () => {
    expect((await repo.getById('l-1'))?.type).toBe('lunar')
    expect(await repo.getById('missing')).toBeUndefined()
  })

  it('getGeometry decodes a packed lunar grid into points', async () => {
    const geo = await repo.getGeometry('l-1')
    expect(geo?.grid?.points).toEqual([
      [0, 0, 2],
      [3, 6, 1],
    ])
  })

  it('getGeometry loads each file once and shares the promise', async () => {
    const fresh = new JsonEclipseRepository(fixture, loaders)
    const before = loads
    const a = fresh.getGeometry('l-1')
    const b = fresh.getGeometry('l-1')
    expect(a).toBe(b)
    await a
    await fresh.getGeometry('l-1')
    expect(loads - before).toBe(1)
  })

  it('getGeometry rejects a file with an unknown schema version, then retries', async () => {
    await expect(repo.getGeometry('s-late')).rejects.toThrow(/schema version 1/)
    await expect(repo.getGeometry('s-late')).rejects.toThrow(/schema version 1/)
  })

  it('getGeometry returns null when the eclipse has no geometry', async () => {
    expect(await repo.getGeometry('s-1')).toBeNull()
    expect(await repo.getGeometry('missing')).toBeNull()
  })
})

describe('generated dataset (src/data/eclipses.json)', () => {
  const index = eclipsesJson as unknown as EclipseIndex
  const repo = new JsonEclipseRepository(index)

  it('covers 2001-2100 for both types', () => {
    const years = index.eclipses.map((e) => Number(e.peakUtc.slice(0, 4)))
    expect(Math.min(...years)).toBe(2001)
    expect(Math.max(...years)).toBe(2100)
    expect(index.eclipses.filter((e) => e.type === 'solar').length).toBe(224)
    expect(index.eclipses.filter((e) => e.type === 'lunar').length).toBe(228)
  })

  it('has an event window around every peak', () => {
    for (const e of index.eclipses) {
      const [start, peak, end] = [e.startUtc, e.peakUtc, e.endUtc].map(Date.parse)
      expect(start, e.id).toBeLessThan(peak)
      expect(peak, e.id).toBeLessThan(end)
      expect(end - start, e.id).toBeLessThan(8 * HOUR)
    }
  })

  it('maps every central solar eclipse except the three non-central ones', () => {
    const unmapped = index.eclipses
      .filter((e) => e.type === 'solar' && e.kind !== 'partial' && !e.hasGeometry)
      .map((e) => e.id)
    expect(unmapped).toEqual(['2014-04-29-solar', '2043-04-09-solar', '2043-10-03-solar'])
  })

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
