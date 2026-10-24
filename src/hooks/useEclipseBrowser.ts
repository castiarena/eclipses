import { useCallback, useEffect, useMemo, useState } from 'react'
import { defaultRepository, type EclipseRepository } from '../data/repository'
import type { EclipseFilter, EclipseSummary } from '../data/types'
import { countdownTarget, remainingUntil, type CountdownTarget, type Remaining } from './countdown'
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
  /** What the countdown counts to (see `countdownTarget`), null once past. */
  target: CountdownTarget | null
  /** Time until `target`. */
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
  /** Pins the eclipse with this id, when it's in the current filter. */
  show: (id: string) => void
  /** Back to the live view. */
  reset: () => void
  /** Local years with at least one eclipse in the current filter. */
  years: Set<number>
  /** Eclipses in the current filter, earliest first, and the shown one's index (-1 when none). */
  list: EclipseSummary[]
  index: number
}

/**
 * Browses the eclipse timeline for `filter`. Live by default (follows the next
 * eclipse and rolls over when it ends); stepping or jumping pins an eclipse,
 * which then stays put as time passes. Ticks every second.
 */
export function useEclipseBrowser(
  filter: EclipseFilter,
  repo: EclipseRepository = defaultRepository,
  /** An eclipse to start pinned on, e.g. from a shared link. An id not in the data falls back to live. */
  initialId: string | null = null,
): EclipseBrowser {
  const [all, setAll] = useState<EclipseSummary[] | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [pin, setPin] = useState<{ filter: EclipseFilter; id: string | null }>({ filter, id: initialId })

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
  const target = eclipse ? countdownTarget(eclipse, now) : null
  const remaining = target ? remainingUntil(target.atMs, now) : null

  const pinTo = useCallback((target: EclipseSummary | undefined) => {
    if (target) setPin({ filter, id: target.id })
  }, [filter])

  const prev = useCallback(() => pinTo(previous), [pinTo, previous])
  const next = useCallback(() => pinTo(following), [pinTo, following])
  const jumpToYear = useCallback((year: number) => pinTo(list[firstIndexInYear(list, year)]), [pinTo, list])
  const show = useCallback((id: string) => pinTo(list.find((e) => e.id === id)), [pinTo, list])
  const reset = useCallback(() => setPin({ filter, id: null }), [filter])

  return {
    eclipse,
    phase,
    target,
    remaining,
    now,
    // A pinned id that isn't in the data shows the live view, so it counts as live once the data is in.
    isLive: pinnedId === null || (all !== null && eclipse?.id !== pinnedId),
    loading: all === null,
    previous,
    following,
    prev,
    next,
    jumpToYear,
    show,
    reset,
    years,
    list,
    index,
  }
}
