import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import { countdownTarget, eventProgress, remainingUntil } from './countdown'

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

const HOUR = 3_600_000

const solar: EclipseSummary = {
  id: '2027-02-06-solar',
  type: 'solar',
  kind: 'annular',
  peakUtc: '2027-02-06T15:59:32Z',
  startUtc: '2027-02-06T13:29:32Z',
  endUtc: '2027-02-06T18:29:32Z',
  magnitude: 0.928,
  gamma: -0.3,
  saros: 131,
  durationSec: 471,
  hasGeometry: true,
}

const lunar: EclipseSummary = {
  ...solar,
  id: '2027-02-20-lunar',
  type: 'lunar',
  kind: 'penumbral',
  peakUtc: '2027-02-20T23:12:50Z',
  startUtc: '2027-02-20T21:12:20Z',
  endUtc: '2027-02-21T01:13:20Z',
  durationSec: null,
}

describe('countdownTarget', () => {
  it('counts solar eclipses to the peak, since their start is an estimate', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    expect(countdownTarget(solar, now)).toEqual({ target: 'peak', atMs: Date.parse(solar.peakUtc) })
  })

  it('counts lunar eclipses to the start, which is exact', () => {
    const now = Date.parse('2026-10-23T12:00:00Z')
    expect(countdownTarget(lunar, now)).toEqual({ target: 'start', atMs: Date.parse(lunar.startUtc) })
  })

  it('while happening, counts to the peak and then to the end', () => {
    expect(countdownTarget(lunar, Date.parse(lunar.startUtc) + HOUR)?.target).toBe('peak')
    expect(countdownTarget(lunar, Date.parse(lunar.peakUtc) + 1000)?.target).toBe('end')
  })

  it('has nothing to count to once it is over', () => {
    expect(countdownTarget(solar, Date.parse(solar.endUtc))).toBeNull()
  })
})

describe('eventProgress', () => {
  it('places now and the peak along start → end', () => {
    const start = Date.parse(solar.startUtc)
    expect(eventProgress(solar, start + HOUR)).toEqual({ now: 0.2, peak: 0.5 })
  })

  it('clamps before the start and after the end', () => {
    expect(eventProgress(lunar, 0).now).toBe(0)
    expect(eventProgress(lunar, Date.parse(lunar.endUtc) + HOUR).now).toBe(1)
  })
})
