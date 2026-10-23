import type { EclipseFilter, EclipseSummary } from '../data/types'

/** Where an eclipse sits relative to now: before its start, during it, or after its end. */
export type Phase = 'upcoming' | 'now' | 'past'

const peakMs = (e: EclipseSummary) => Date.parse(e.peakUtc)

/** Eclipses matching the filter, earliest first. */
export function filterTimeline(all: EclipseSummary[], filter: EclipseFilter): EclipseSummary[] {
  return all.filter((e) => filter === 'all' || e.type === filter).sort((a, b) => peakMs(a) - peakMs(b))
}

/** Index of the eclipse the live view shows: the first one that hasn't ended. -1 once all have. */
export function liveIndex(list: EclipseSummary[], nowMs: number): number {
  return list.findIndex((e) => Date.parse(e.endUtc) > nowMs)
}

export function phaseOf(eclipse: EclipseSummary, nowMs: number): Phase {
  if (nowMs < Date.parse(eclipse.startUtc)) return 'upcoming'
  if (nowMs < Date.parse(eclipse.endUtc)) return 'now'
  return 'past'
}

/** Index of the eclipse whose peak is closest to `targetMs`; a tie goes to the later one. -1 if empty. */
export function nearestIndex(list: EclipseSummary[], targetMs: number): number {
  let best = -1
  let bestDistance = Infinity
  list.forEach((e, i) => {
    const distance = Math.abs(peakMs(e) - targetMs)
    if (distance <= bestDistance) {
      best = i
      bestDistance = distance
    }
  })
  return best
}

/** Calendar year of the peak in the viewer's time zone, matching the headline date. */
export function localYear(iso: string, timeZone?: string): number {
  return Number(new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone }).format(new Date(iso)))
}

/** First eclipse whose local peak year is `year`, or -1. */
export function firstIndexInYear(list: EclipseSummary[], year: number, timeZone?: string): number {
  return list.findIndex((e) => localYear(e.peakUtc, timeZone) === year)
}

/** Local years that have at least one eclipse, for disabling empty years in the picker. */
export function yearsWithEclipses(list: EclipseSummary[], timeZone?: string): Set<number> {
  return new Set(list.map((e) => localYear(e.peakUtc, timeZone)))
}

// Browsing state is just the pinned eclipse id; null means the live view.
// The helpers below are pure so the hook stays thin and the rules are testable.

/** Index the view shows. A pinned id missing from the list falls back to live. */
export function currentIndex(list: EclipseSummary[], pinnedId: string | null, nowMs: number): number {
  const pinned = pinnedId === null ? -1 : list.findIndex((e) => e.id === pinnedId)
  return pinned !== -1 ? pinned : liveIndex(list, nowMs)
}

/**
 * Index one step from the current view, or -1 at the ends (no wrap).
 * After every eclipse has ended, live sits just past the end, so prev lands on the last one.
 */
export function stepIndex(list: EclipseSummary[], pinnedId: string | null, nowMs: number, delta: 1 | -1): number {
  let from = currentIndex(list, pinnedId, nowMs)
  if (from === -1) from = list.length
  const to = from + delta
  return to >= 0 && to < list.length ? to : -1
}

/**
 * Pinned id after the filter changes: kept if the eclipse is still in the new list,
 * otherwise the nearest in time. Live stays live.
 */
export function retarget(
  all: EclipseSummary[],
  next: EclipseSummary[],
  pinnedId: string | null,
): string | null {
  if (pinnedId === null) return null
  if (next.some((e) => e.id === pinnedId)) return pinnedId
  const pinned = all.find((e) => e.id === pinnedId)
  if (!pinned) return null
  return next[nearestIndex(next, peakMs(pinned))]?.id ?? null
}
