import { useEffect, useState } from 'react'
import { defaultRepository, type EclipseRepository } from '../data/repository'
import type { EclipseSummary, EclipseType } from '../data/types'
import { nextEclipseAfter, remainingUntil, type Remaining } from './countdown'

export interface EclipseCountdown {
  eclipse: EclipseSummary | undefined
  remaining: Remaining | null
  loading: boolean
}

/**
 * Countdown to the next eclipse of `type`. Ticks every second. When the
 * current eclipse passes, it moves to the following one.
 */
export function useEclipseCountdown(
  type: EclipseType,
  repo: EclipseRepository = defaultRepository,
): EclipseCountdown {
  const [upcoming, setUpcoming] = useState<EclipseSummary[] | null>(null)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    let active = true
    repo.getUpcoming(type).then((list) => {
      if (active) setUpcoming(list)
    })
    return () => {
      active = false
    }
  }, [type, repo])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const eclipse = upcoming ? nextEclipseAfter(upcoming, now) : undefined
  // Every loaded eclipse has passed: fetch the list again for the next window.
  const exhausted = upcoming !== null && eclipse === undefined

  useEffect(() => {
    if (!exhausted) return
    let active = true
    repo.getUpcoming(type).then((list) => {
      if (active) setUpcoming(list)
    })
    return () => {
      active = false
    }
  }, [exhausted, type, repo])

  const remaining = eclipse ? remainingUntil(Date.parse(eclipse.peakUtc), now) : null
  return { eclipse, remaining, loading: upcoming === null }
}
