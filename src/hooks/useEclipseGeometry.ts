import { useEffect, useState } from 'react'
import { defaultRepository, type EclipseRepository } from '../data/repository'
import type { EclipseGeometry } from '../data/types'

export interface EclipseGeometryState {
  geometry: EclipseGeometry | null
  loading: boolean
}

/** Loads visibility geometry for one eclipse. Stale results for a previous id are ignored. */
export function useEclipseGeometry(
  id: string | undefined,
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

  if (!id) return { geometry: null, loading: false }
  if (loaded?.id !== id) return { geometry: null, loading: true }
  return { geometry: loaded.geometry, loading: false }
}
