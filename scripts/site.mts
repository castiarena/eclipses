import { readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { EclipseIndex, EclipseSummary } from '../src/data/types.ts'

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
export const DIST = join(ROOT, 'dist')

/** Where the site is served from: the origin and, as for `vite build`, the base path. */
export const ORIGIN = (process.env.SITE_ORIGIN ?? 'https://castiarena.github.io').replace(/\/$/, '')
export const BASE = process.env.BASE_PATH ?? '/'

export async function readEclipses(): Promise<EclipseSummary[]> {
  const index = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'eclipses.json'), 'utf8')) as EclipseIndex
  return index.eclipses
}
