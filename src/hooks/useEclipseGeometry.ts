import { useEffect, useState } from 'react'
import { defaultRepository, type EclipseRepository } from '../data/repository'
import type { EclipseGeometry } from '../data/types'

export interface EclipseGeometryState {
  /** Geometry for `id` only; null while it loads. Use it for anything tied to this eclipse. */
  geometry: EclipseGeometry | null
  /**
   * The last geometry that finished loading, which may belong to the previous id.
   * The globe draws this so its overlay doesn't blank between steps.
   */
  displayGeometry: EclipseGeometry | null
  loading: boolean
}

/**
 * Loads visibility geometry for one eclipse. Stale results for a previous id are ignored.
 * `prefetch` ids (e.g. the neighbours) are warmed in the repository cache.
 */
export function useEclipseGeometry(
  id: string | undefined,
  prefetch: (string | undefined)[] = [],
  repo: EclipseRepository = defaultRepository,
): EclipseGeometryState {
  const [loaded, setLoaded] = useState<{ id: string; geometry: EclipseGeometry | null } | null>(null)

  useEffect(() => {
    if (!id) return
    let active = true
    repo.getGeometry(id).then((geometry) => {
      if (active) setLoaded({ id, geometry })
    })
    return () => {
      active = false
    }
  }, [id, repo])

  const prefetchKey = prefetch.filter(Boolean).join(',')
  useEffect(() => {
    if (!prefetchKey) return
    // Prefetch is best effort; a failure surfaces when the eclipse is actually shown.
    for (const other of prefetchKey.split(',')) repo.getGeometry(other).catch(() => {})
  }, [prefetchKey, repo])

  const displayGeometry = loaded?.geometry ?? null
  if (!id) return { geometry: null, displayGeometry, loading: false }
  if (loaded?.id !== id) return { geometry: null, displayGeometry, loading: true }
  return { geometry: loaded.geometry, displayGeometry, loading: false }
}
