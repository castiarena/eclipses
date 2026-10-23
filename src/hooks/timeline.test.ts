import { describe, expect, it } from 'vitest'
import type { EclipseSummary, EclipseType } from '../data/types'
import {
  currentIndex,
  filterTimeline,
  firstIndexInYear,
  liveIndex,
  nearestIndex,
  phaseOf,
  retarget,
  stepIndex,
  yearsWithEclipses,
} from './timeline'

const HOUR = 3_600_000

const eclipse = (id: string, type: EclipseType, peakUtc: string): EclipseSummary => ({
  id,
  type,
  kind: 'total',
  peakUtc,
  startUtc: new Date(Date.parse(peakUtc) - 2 * HOUR).toISOString(),
  endUtc: new Date(Date.parse(peakUtc) + 2 * HOUR).toISOString(),
  magnitude: 1,
  gamma: 0,
  saros: 1,
  durationSec: null,
  hasGeometry: false,
})

// Deliberately out of order: filterTimeline must sort.
const all = [
  eclipse('s2', 'solar', '2027-08-02T10:00:00Z'),
  eclipse('l1', 'lunar', '2027-02-20T23:00:00Z'),
  eclipse('s1', 'solar', '2027-02-06T16:00:00Z'),
  eclipse('l2', 'lunar', '2027-08-17T07:00:00Z'),
  // 01:00 UTC on New Year's Day is still 31 Dec in Buenos Aires (UTC−3).
  eclipse('s3', 'solar', '2029-01-01T01:00:00Z'),
]
const ids = (list: EclipseSummary[]) => list.map((e) => e.id)
const at = (iso: string) => Date.parse(iso)

const solar = filterTimeline(all, 'solar')
const lunar = filterTimeline(all, 'lunar')
const both = filterTimeline(all, 'all')

describe('filterTimeline', () => {
  it('keeps one type, earliest first', () => {
    expect(ids(solar)).toEqual(['s1', 's2', 's3'])
    expect(ids(lunar)).toEqual(['l1', 'l2'])
  })

  it('interleaves both types for all', () => {
    expect(ids(both)).toEqual(['s1', 'l1', 's2', 'l2', 's3'])
  })
})

describe('liveIndex', () => {
  it('is the first eclipse that has not ended', () => {
    expect(liveIndex(solar, at('2026-10-01T00:00:00Z'))).toBe(0)
    expect(liveIndex(solar, at('2027-03-01T00:00:00Z'))).toBe(1)
  })

  it('stays on an eclipse until its end, not its peak', () => {
    expect(liveIndex(solar, at('2027-02-06T17:00:00Z'))).toBe(0)
    expect(liveIndex(solar, at('2027-02-06T18:00:00Z'))).toBe(1)
  })

  it('is -1 when every eclipse has ended, or the list is empty', () => {
    expect(liveIndex(solar, at('2030-01-01T00:00:00Z'))).toBe(-1)
    expect(liveIndex([], 0)).toBe(-1)
  })
})

describe('phaseOf', () => {
  const e = solar[0]
  it('is upcoming before the start, now until the end, then past', () => {
    expect(phaseOf(e, at('2027-02-06T13:59:59Z'))).toBe('upcoming')
    expect(phaseOf(e, at('2027-02-06T14:00:00Z'))).toBe('now')
    expect(phaseOf(e, at('2027-02-06T17:59:59Z'))).toBe('now')
    expect(phaseOf(e, at('2027-02-06T18:00:00Z'))).toBe('past')
  })
})

describe('nearestIndex', () => {
  it('finds the closest peak', () => {
    expect(nearestIndex(lunar, at('2027-03-01T00:00:00Z'))).toBe(0)
    expect(nearestIndex(lunar, at('2027-08-01T00:00:00Z'))).toBe(1)
  })

  it('picks the later one on a tie', () => {
    const list = [eclipse('a', 'solar', '2027-01-01T00:00:00Z'), eclipse('b', 'solar', '2027-01-03T00:00:00Z')]
    expect(nearestIndex(list, at('2027-01-02T00:00:00Z'))).toBe(1)
  })

  it('handles targets outside the list and an empty list', () => {
    expect(nearestIndex(lunar, at('2001-01-01T00:00:00Z'))).toBe(0)
    expect(nearestIndex(lunar, at('2100-01-01T00:00:00Z'))).toBe(1)
    expect(nearestIndex([], 0)).toBe(-1)
  })
})

describe('years', () => {
  it('uses the local year, which can differ from the UTC year at New Year', () => {
    expect(firstIndexInYear(solar, 2029, 'UTC')).toBe(2)
    expect(firstIndexInYear(solar, 2028, 'UTC')).toBe(-1)
    expect(firstIndexInYear(solar, 2028, 'America/Argentina/Buenos_Aires')).toBe(2)
    expect(firstIndexInYear(solar, 2029, 'America/Argentina/Buenos_Aires')).toBe(-1)
  })

  it('returns the first eclipse of the year', () => {
    expect(firstIndexInYear(both, 2027, 'UTC')).toBe(0)
  })

  it('lists the years that have eclipses', () => {
    expect([...yearsWithEclipses(solar, 'UTC')]).toEqual([2027, 2029])
    expect([...yearsWithEclipses(lunar, 'UTC')]).toEqual([2027])
  })
})

describe('browsing', () => {
  const now = at('2027-03-01T00:00:00Z') // live solar is s2, live lunar is l2

  it('shows the live eclipse unless one is pinned', () => {
    expect(currentIndex(solar, null, now)).toBe(1)
    expect(currentIndex(solar, 's1', now)).toBe(0)
  })

  it('falls back to live when the pinned id is not in the list', () => {
    expect(currentIndex(solar, 'l1', now)).toBe(1)
  })

  it('keeps a pinned eclipse in place as time passes', () => {
    const later = at('2028-06-01T00:00:00Z')
    expect(currentIndex(solar, 's2', later)).toBe(1)
    expect(currentIndex(solar, null, later)).toBe(2)
  })

  it('steps from live in both directions', () => {
    expect(stepIndex(solar, null, now, -1)).toBe(0)
    expect(stepIndex(solar, null, now, 1)).toBe(2)
  })

  it('stops at the ends instead of wrapping', () => {
    expect(stepIndex(solar, 's1', now, -1)).toBe(-1)
    expect(stepIndex(solar, 's3', now, 1)).toBe(-1)
  })

  it('steps back onto the last eclipse once all have ended', () => {
    const after = at('2101-01-01T00:00:00Z')
    expect(stepIndex(solar, null, after, -1)).toBe(2)
    expect(stepIndex(solar, null, after, 1)).toBe(-1)
  })

  it('cannot step through an empty list', () => {
    expect(stepIndex([], null, now, 1)).toBe(-1)
    expect(stepIndex([], null, now, -1)).toBe(-1)
  })
})

describe('retarget', () => {
  it('keeps live as live', () => {
    expect(retarget(all, lunar, null)).toBeNull()
  })

  it('keeps the pinned eclipse when it is in the new list', () => {
    expect(retarget(all, both, 's2')).toBe('s2')
  })

  it('moves to the nearest eclipse of the new filter', () => {
    expect(retarget(all, lunar, 's1')).toBe('l1')
    expect(retarget(all, lunar, 's2')).toBe('l2')
    expect(retarget(all, solar, 'l1')).toBe('s1')
  })

  it('falls back to live for an unknown id or an empty list', () => {
    expect(retarget(all, lunar, 'missing')).toBeNull()
    expect(retarget(all, [], 's1')).toBeNull()
  })
})
