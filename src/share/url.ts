import type { EclipseType } from '../data/types'

const ECLIPSE_ID = /^\d{4}-\d{2}-\d{2}-(solar|lunar)$/

const withSlash = (base: string) => (base.endsWith('/') ? base : `${base}/`)

/** Where the app lives: "/" locally, "/eclipses/" on GitHub Pages. */
export const appBase = (): string => withSlash(import.meta.env.BASE_URL)

/** Path of one eclipse's page under `base`, e.g. "/eclipses/e/2026-08-12-solar/". */
export function eclipsePath(id: string, base = '/'): string {
  return `${withSlash(base)}e/${id}/`
}

/** Absolute URL to share for an eclipse. */
export function shareUrl(origin: string, id: string, base = '/'): string {
  return `${origin}${eclipsePath(id, base)}`
}

/** The eclipse id in a location path ("/eclipses/e/2026-08-12-solar/"), or null when it isn't an eclipse page. */
export function parseEclipseId(pathname: string, base = '/'): string | null {
  const prefix = `${withSlash(base)}e/`
  if (!pathname.startsWith(prefix)) return null
  const id = pathname.slice(prefix.length).replace(/\/$/, '')
  return ECLIPSE_ID.test(id) ? id : null
}

/** The type an id names ("2026-08-12-solar" -> "solar"). */
export function typeOfId(id: string): EclipseType {
  return id.endsWith('-lunar') ? 'lunar' : 'solar'
}
