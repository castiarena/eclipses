import { describe, expect, it } from 'vitest'
import { JsonEclipseRepository } from '../data/repository'
import type { EclipseGeometry } from '../data/types'
import { describeVisibility } from './describe'

const repo = new JsonEclipseRepository()

/** Lunar grid with zone 2 (whole eclipse) everywhere inside the given lng range. */
const lunarGrid = (lngMin: number, lngMax: number): EclipseGeometry => {
  const points: [number, number, number][] = []
  for (let lat = -90; lat <= 90; lat += 3) {
    for (let lng = -180; lng < 180; lng += 3) {
      if (lng >= lngMin && lng <= lngMax) points.push([lat, lng, 2])
    }
  }
  return { id: 'fixture-lunar', schemaVersion: 2, grid: { step: 3, zones: { 1: 'partial', 2: 'full' }, points } }
}

describe('describeVisibility', () => {
  it('names regions that see the whole lunar eclipse and merges the Americas', () => {
    const text = describeVisibility({ type: 'lunar', kind: 'penumbral' }, lunarGrid(-170, -30))
    expect(text).toBe('Visible from anywhere the Moon is above the horizon — the Americas get the full show.')
  })

  it('uses the singular verb for one region', () => {
    const text = describeVisibility({ type: 'lunar', kind: 'total' }, lunarGrid(110, 156))
    expect(text).toMatch(/— Australia gets the full show\.$/)
  })

  it('falls back to a plain sentence without geometry', () => {
    expect(describeVisibility({ type: 'lunar', kind: 'total' }, null)).toBe(
      'Visible from anywhere the Moon is above the horizon.',
    )
    expect(describeVisibility({ type: 'solar', kind: 'partial' }, null)).toMatch(/^A partial eclipse/)
    expect(describeVisibility({ type: 'solar', kind: 'total' }, null)).toMatch(/only grazes the Earth near a pole/)
  })

  it('names the land the 2027-08-02 total solar path crosses', async () => {
    const geometry = await repo.getGeometry('2027-08-02-solar')
    const text = describeVisibility({ type: 'solar', kind: 'total' }, geometry)
    expect(text).toMatch(/^The path of totality crosses Africa and Asia;/)
  })

  it('describes every eclipse in the catalog, in every tense, without throwing', async () => {
    for (const e of await repo.getAll()) {
      const geometry = e.hasGeometry ? await repo.getGeometry(e.id) : null
      for (const tense of ['future', 'present', 'past'] as const) {
        expect(describeVisibility(e, geometry, tense)).toMatch(/\.$/)
      }
    }
  })

  it('switches tense for lunar eclipses', () => {
    const grid = lunarGrid(110, 156)
    expect(describeVisibility({ type: 'lunar', kind: 'total' }, grid, 'present')).toBe(
      'Visible now from anywhere the Moon is above the horizon — Australia is getting the full show.',
    )
    expect(describeVisibility({ type: 'lunar', kind: 'total' }, grid, 'past')).toBe(
      'Was visible from anywhere the Moon was above the horizon — Australia got the full show.',
    )
    expect(describeVisibility({ type: 'lunar', kind: 'total' }, lunarGrid(-170, -30), 'present')).toMatch(
      /the Americas are getting the full show\.$/,
    )
  })

  it('switches tense for solar eclipses', async () => {
    const geometry = await repo.getGeometry('2027-08-02-solar')
    expect(describeVisibility({ type: 'solar', kind: 'total' }, geometry, 'past')).toMatch(
      /^The path of totality crossed Africa and Asia; a much wider area saw a partial eclipse\.$/,
    )
    expect(describeVisibility({ type: 'solar', kind: 'partial' }, null, 'past')).toMatch(/covered part of the Sun/)
    expect(describeVisibility({ type: 'solar', kind: 'total' }, null, 'past')).toMatch(/only grazed the Earth/)
  })
})
