/// <reference types="vite/client" />
import indexJson from './eclipses.json'
import { decodeGrid } from './grid'
import type { EclipseGeometry, EclipseGeometryFile, EclipseIndex, EclipseSummary, EclipseType } from './types'

/** Data schema this code reads; bumped by scripts/build-eclipse-data.ts when the format changes. */
export const SCHEMA_VERSION = 2

/**
 * Data access for eclipses. The UI depends only on this interface, so the
 * static JSON implementation can be swapped for an HTTP or DB one later.
 */
export interface EclipseRepository {
  /** Every eclipse in the dataset, earliest first. */
  getAll(): Promise<EclipseSummary[]>
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
const geoLoaders = import.meta.glob<EclipseGeometryFile>('./geo/*.json', { import: 'default' })

function checkSchema(what: string, version: number) {
  if (version !== SCHEMA_VERSION) {
    throw new Error(`${what} has schema version ${version}; this build reads version ${SCHEMA_VERSION}`)
  }
}

/** Unpacks the on-disk lunar grid into the points shape the UI uses. */
export function fromFile(file: EclipseGeometryFile): EclipseGeometry {
  checkSchema(`geometry ${file.id}`, file.schemaVersion)
  if (!file.grid) return file
  const { step, zones } = file.grid
  return { ...file, grid: { step, zones, points: decodeGrid(file.grid) } }
}

export class JsonEclipseRepository implements EclipseRepository {
  private readonly index: EclipseIndex
  private readonly sorted: EclipseSummary[]
  // Shared by prefetches and revisits, so each file is fetched and decoded once.
  private readonly geometryCache = new Map<string, Promise<EclipseGeometry | null>>()

  constructor(
    index: EclipseIndex = indexJson as EclipseIndex,
    private readonly loaders: Record<string, () => Promise<EclipseGeometryFile>> = geoLoaders,
  ) {
    checkSchema('eclipse index', index.schemaVersion)
    this.index = index
    this.sorted = [...index.eclipses].sort((a, b) => Date.parse(a.peakUtc) - Date.parse(b.peakUtc))
  }

  async getAll(): Promise<EclipseSummary[]> {
    return this.sorted
  }

  async getUpcoming(type: EclipseType, nowMs: number = Date.now()): Promise<EclipseSummary[]> {
    return selectUpcoming(this.index.eclipses, type, nowMs)
  }

  async getById(id: string): Promise<EclipseSummary | undefined> {
    return this.index.eclipses.find((e) => e.id === id)
  }

  getGeometry(id: string): Promise<EclipseGeometry | null> {
    let cached = this.geometryCache.get(id)
    if (!cached) {
      cached = this.loadGeometry(id)
      // A failed load shouldn't stick; let the next call retry.
      cached.catch(() => this.geometryCache.delete(id))
      this.geometryCache.set(id, cached)
    }
    return cached
  }

  private async loadGeometry(id: string): Promise<EclipseGeometry | null> {
    const summary = await this.getById(id)
    if (!summary?.hasGeometry) return null
    const load = this.loaders[`./geo/${id}.json`]
    return load ? fromFile(await load()) : null
  }
}

export const defaultRepository: EclipseRepository = new JsonEclipseRepository()
