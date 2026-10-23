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

export interface CountdownTarget {
  target: 'start' | 'peak' | 'end'
  atMs: number
}

/**
 * What the countdown counts to. Solar eclipses count to the peak, because their start is a ±2.5 h
 * estimate; lunar eclipses count to the start, which is exact. While it's happening: the peak, then
 * the end. Null once it's over.
 */
export function countdownTarget(eclipse: EclipseSummary, nowMs: number): CountdownTarget | null {
  const start = Date.parse(eclipse.startUtc)
  const peak = Date.parse(eclipse.peakUtc)
  const end = Date.parse(eclipse.endUtc)
  if (nowMs >= end) return null
  if (nowMs < start) return eclipse.type === 'solar' ? { target: 'peak', atMs: peak } : { target: 'start', atMs: start }
  return nowMs < peak ? { target: 'peak', atMs: peak } : { target: 'end', atMs: end }
}

/** Where now and the peak fall along start → end, as fractions from 0 to 1. */
export function eventProgress(eclipse: EclipseSummary, nowMs: number): { now: number; peak: number } {
  const start = Date.parse(eclipse.startUtc)
  const span = Date.parse(eclipse.endUtc) - start
  const clamp = (x: number) => Math.min(1, Math.max(0, x))
  return {
    now: clamp((nowMs - start) / span),
    peak: clamp((Date.parse(eclipse.peakUtc) - start) / span),
  }
}
