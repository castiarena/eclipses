import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import { nextEclipseAfter, remainingUntil } from './countdown'

const eclipse = (id: string, peakUtc: string): EclipseSummary => ({
  id,
  type: 'solar',
  kind: 'total',
  peakUtc,
  magnitude: 1,
  gamma: 0,
  saros: 1,
  durationSec: null,
  hasGeometry: false,
})

describe('remainingUntil', () => {
  it('splits the difference into days, hours, minutes and seconds', () => {
    const now = Date.parse('2027-02-01T00:00:00Z')
    const peak = now + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000
    expect(remainingUntil(peak, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('returns null once the peak has passed or is exactly now', () => {
    const peak = Date.parse('2027-02-06T15:59:32Z')
    expect(remainingUntil(peak, peak)).toBeNull()
    expect(remainingUntil(peak, peak + 1000)).toBeNull()
  })
})

describe('nextEclipseAfter', () => {
  const list = [
    eclipse('a', '2027-02-06T15:59:32Z'),
    eclipse('b', '2027-08-02T10:06:34Z'),
    eclipse('c', '2028-01-26T15:07:43Z'),
  ]

  it('returns the first eclipse still ahead', () => {
    expect(nextEclipseAfter(list, Date.parse('2027-01-01T00:00:00Z'))?.id).toBe('a')
  })

  it('rolls over to the following eclipse after the current peak passes', () => {
    expect(nextEclipseAfter(list, Date.parse('2027-02-06T16:00:00Z'))?.id).toBe('b')
  })

  it('returns undefined when every eclipse has passed', () => {
    expect(nextEclipseAfter(list, Date.parse('2030-01-01T00:00:00Z'))).toBeUndefined()
  })
})
