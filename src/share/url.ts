import type { EclipseType } from '../data/types'
import { currentLocale } from '../i18n'
import { DEFAULT_LOCALE, isLocale, type Locale } from '../i18n/locales'

const ECLIPSE_ID = /^\d{4}-\d{2}-\d{2}-(solar|lunar)$/

const withSlash = (base: string) => (base.endsWith('/') ? base : `${base}/`)

/** Where the app lives: "/" locally, "/eclipses/" on GitHub Pages. */
export const appBase = (): string => withSlash(import.meta.env.BASE_URL)

/** Where a locale's pages live under `base`: English at the root, the others under "/<code>/". */
export function localeBase(locale: Locale, base = '/'): string {
  return locale === DEFAULT_LOCALE ? withSlash(base) : `${withSlash(base)}${locale}/`
}

/** The locale a path is in: "/eclipses/es/e/…" -> "es". Anything else is English. */
export function localeFromPath(pathname: string, base = '/'): Locale {
  const prefix = withSlash(base)
  if (!pathname.startsWith(prefix)) return DEFAULT_LOCALE
  const code = pathname.slice(prefix.length).split('/')[0]
  return isLocale(code) ? code : DEFAULT_LOCALE
}

/** The same page in another locale: "/eclipses/e/<id>/" -> "/eclipses/es/e/<id>/". */
export function pathInLocale(pathname: string, locale: Locale, base = '/'): string {
  const from = localeBase(localeFromPath(pathname, base), base)
  const rest = pathname.startsWith(from) ? pathname.slice(from.length) : ''
  return `${localeBase(locale, base)}${rest}`
}

/** Base of the page being viewed: the app base plus its locale's prefix. */
export const pageBase = (): string => localeBase(currentLocale(), appBase())

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
