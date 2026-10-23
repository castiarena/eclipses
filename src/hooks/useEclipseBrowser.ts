import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultRepository, type EclipseRepository } from '../data/repository'
import type { EclipseFilter, EclipseSummary } from '../data/types'
import { remainingUntil, type Remaining } from './countdown'
import {
  currentIndex,
  filterTimeline,
  firstIndexInYear,
  phaseOf,
  retarget,
  stepIndex,
  yearsWithEclipses,
  type Phase,
} from './timeline'

export interface EclipseBrowser {
  eclipse: EclipseSummary | undefined
  phase: Phase | undefined
  /** Time until the start while upcoming, until the end while happening, null once past. */
  remaining: Remaining | null
  /** The clock the phase and remaining time were computed from (ticks every second). */
  now: number
  /** True when nothing is pinned and the view follows the next eclipse by itself. */
  isLive: boolean
  loading: boolean
  /** The eclipses prev() and next() would show, for labels and prefetching. */
  previous: EclipseSummary | undefined
  following: EclipseSummary | undefined
  prev: () => void
  next: () => void
  /** Pins the first eclipse in that (local) year; does nothing for an empty year. */
  jumpToYear: (year: number) => void
  /** Back to the live view. */
  reset: () => void
  /** Local years with at least one eclipse in the current filter. */
  years: Set<number>
}

/**
 * Browses the eclipse timeline for `filter`. Live by default (follows the next
 * eclipse and rolls over when it ends); stepping or jumping pins an eclipse,
 * which then stays put as time passes. Ticks every second.
 */
export function useEclipseBrowser(
  filter: EclipseFilter,
  repo: EclipseRepository = defaultRepository,
): EclipseBrowser {
  const [all, setAll] = useState<EclipseSummary[] | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [pin, setPin] = useState<{ filter: EclipseFilter; id: string | null }>({ filter, id: null })

  useEffect(() => {
    let active = true
    repo.getAll().then((list) => {
      if (active) setAll(list)
    })
    return () => {
      active = false
    }
  }, [repo])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const list = useMemo(() => (all ? filterTimeline(all, filter) : []), [all, filter])
  const years = useMemo(() => yearsWithEclipses(list), [list])

  // A filter change moves the pin to the nearest eclipse of the new filter.
  // Adjusted during render (not in an effect) so no frame shows the old pin.
  let pinnedId = pin.id
  if (pin.filter !== filter) {
    pinnedId = all ? retarget(all, list, pin.id) : null
    setPin({ filter, id: pinnedId })
  }

  const index = currentIndex(list, pinnedId, now)
  const eclipse = list[index]
  const previous = list[stepIndex(list, pinnedId, now, -1)]
  const following = list[stepIndex(list, pinnedId, now, 1)]

  const phase = eclipse ? phaseOf(eclipse, now) : undefined
  const remaining =
    eclipse && phase === 'upcoming'
      ? remainingUntil(Date.parse(eclipse.startUtc), now)
      : eclipse && phase === 'now'
        ? remainingUntil(Date.parse(eclipse.endUtc), now)
        : null

  const pinTo = useCallback((target: EclipseSummary | undefined) => {
    if (target) setPin({ filter, id: target.id })
  }, [filter])

  const prev = useCallback(() => pinTo(previous), [pinTo, previous])
  const next = useCallback(() => pinTo(following), [pinTo, following])
  const jumpToYear = useCallback((year: number) => pinTo(list[firstIndexInYear(list, year)]), [pinTo, list])
  const reset = useCallback(() => setPin({ filter, id: null }), [filter])

  return {
    eclipse,
    phase,
    remaining,
    now,
    isLive: pinnedId === null,
    loading: all === null,
    previous,
    following,
    prev,
    next,
    jumpToYear,
    reset,
    years,
  }
}
