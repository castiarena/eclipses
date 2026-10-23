import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import { nextSteps } from './NextSteps'

const HOUR = 3_600_000
const at = (iso: string) => Date.parse(iso)

const solar = (id: string, kind: EclipseSummary['kind'], saros: number, peakUtc: string, durationSec: number | null = null): EclipseSummary => ({
  id,
  type: 'solar',
  kind,
  peakUtc,
  startUtc: new Date(at(peakUtc) - 2.5 * HOUR).toISOString(),
  endUtc: new Date(at(peakUtc) + 2.5 * HOUR).toISOString(),
  magnitude: 1,
  gamma: 0,
  saros,
  durationSec,
  hasGeometry: true,
})

// Peaks at midday UTC where the local date matters, so the labels don't depend on the machine's time zone.
const list = [
  solar('2026-08-12', 'total', 126, '2026-08-12T17:45:51Z', 138),
  solar('2027-02-06', 'annular', 131, '2027-02-06T15:59:32Z', 471),
  solar('2027-08-02', 'total', 136, '2027-08-02T10:06:34Z', 383),
  solar('2044-08-23', 'total', 126, '2044-08-23T12:00:00Z', 122),
]
const now = at('2026-10-23T12:00:00Z')

describe('nextSteps', () => {
  it('past: the next of the same kind, then the series returning', () => {
    expect(nextSteps(list, list[0], 'past', null, now)).toEqual([
      { id: '2027-08-02', label: 'Next total solar eclipse', value: '2 Aug 2027 · 6m 23s' },
      { id: '2044-08-23', label: 'Saros 126 returns', value: '23 Aug 2044' },
    ])
  })

  it('nothing for an eclipse coming up within a year', () => {
    expect(nextSteps(list, list[1], 'upcoming', { target: 'peak', atMs: at(list[1].peakUtc) }, now)).toEqual([])
  })

  it('far off: only the sooner one of the same kind, and no series step past the catalog', () => {
    const far = list[3]
    expect(nextSteps(list, far, 'upcoming', { target: 'peak', atMs: at(far.peakUtc) }, now)).toEqual([
      { id: '2027-08-02', label: 'Next total solar eclipse', value: '2 Aug 2027 · 6m 23s' },
    ])
  })
})
