import type { EclipseSummary } from '../data/types'

export interface Remaining {
  days: number
  hours: number
  minutes: number
  seconds: number
}

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

/** Time left until `peakMs`, or null once it has passed. */
export function remainingUntil(peakMs: number, nowMs: number): Remaining | null {
  const diff = peakMs - nowMs
  if (diff <= 0) return null
  return {
    days: Math.floor(diff / DAY),
    hours: Math.floor((diff % DAY) / HOUR),
    minutes: Math.floor((diff % HOUR) / MINUTE),
    seconds: Math.floor((diff % MINUTE) / SECOND),
  }
}

/** First eclipse in an ascending list whose peak is still ahead of `nowMs`. */
export function nextEclipseAfter(
  eclipses: EclipseSummary[],
  nowMs: number,
): EclipseSummary | undefined {
  return eclipses.find((e) => Date.parse(e.peakUtc) > nowMs)
}
