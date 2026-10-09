/// <reference types="vite/client" />
import indexJson from './eclipses.json'
import type { EclipseGeometry, EclipseIndex, EclipseSummary, EclipseType } from './types'

/**
 * Data access for eclipses. The UI depends only on this interface, so the
 * static JSON implementation can be swapped for an HTTP or DB one later.
 */
export interface EclipseRepository {
  getUpcoming(type: EclipseType, nowMs?: number): Promise<EclipseSummary[]>
  getById(id: string): Promise<EclipseSummary | undefined>
  getGeometry(id: string): Promise<EclipseGeometry | null>
}

/** Upcoming eclipses of one type, earliest first. Pure so it can be tested directly. */
export function selectUpcoming(
  eclipses: EclipseSummary[],
  type: EclipseType,
  nowMs: number,
): EclipseSummary[] {
  return eclipses
    .filter((e) => e.type === type && Date.parse(e.peakUtc) > nowMs)
    .sort((a, b) => Date.parse(a.peakUtc) - Date.parse(b.peakUtc))
}

// Geometry files are loaded lazily, one per eclipse, when they are needed.
const geoLoaders = import.meta.glob<EclipseGeometry>('./geo/*.json', { import: 'default' })

export class JsonEclipseRepository implements EclipseRepository {
  private readonly index: EclipseIndex

  constructor(index: EclipseIndex = indexJson as EclipseIndex) {
    this.index = index
  }

  async getUpcoming(type: EclipseType, nowMs: number = Date.now()): Promise<EclipseSummary[]> {
    return selectUpcoming(this.index.eclipses, type, nowMs)
  }

  async getById(id: string): Promise<EclipseSummary | undefined> {
    return this.index.eclipses.find((e) => e.id === id)
  }

  async getGeometry(id: string): Promise<EclipseGeometry | null> {
    const summary = await this.getById(id)
    if (!summary?.hasGeometry) return null
    const load = geoLoaders[`./geo/${id}.json`]
    return load ? load() : null
  }
}

export const defaultRepository: EclipseRepository = new JsonEclipseRepository()
