import type { EclipseFilter, EclipseKind, EclipseType } from '../data/types'
import type { Remaining } from '../hooks/countdown'
import { intlLocale, t } from '../i18n'

export const FILTER_KEY = {
  solar: 'filter.solar',
  lunar: 'filter.lunar',
  all: 'filter.all',
} as const satisfies Record<EclipseFilter, string>

/** Legend label for a solar eclipse's central path. */
export const CENTRAL_PATH_KEY = {
  total: 'legend.centralPath.total',
  annular: 'legend.centralPath.annular',
  hybrid: 'legend.centralPath.hybrid',
} as const satisfies Partial<Record<EclipseKind, string>>

type Named = { kind: EclipseKind; type: EclipseType }

/** "Total solar eclipse" */
export const eclipseName = ({ kind, type }: Named): string => t('eclipse.name', { kind, type })

/** "Total solar", for the eyebrow. */
export const eclipseShortName = ({ kind, type }: Named): string => t('eclipse.shortName', { kind, type })

// Dates follow the locale's own pattern; `LOCALES` picks en-GB for English to match the design.
const formatDate = (iso: string, options: Intl.DateTimeFormatOptions, timeZone?: string) =>
  new Intl.DateTimeFormat(intlLocale(), { ...options, timeZone }).format(new Date(iso))

// Numeric parts only, so the locale doesn't change them.
function dateParts(iso: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  const parts = new Intl.DateTimeFormat('en-GB', { ...options, timeZone }).formatToParts(new Date(iso))
  return Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>
}

/** "2027-02-06T15:59:32Z" -> "15:59 UTC" */
export function formatUtcTime(iso: string): string {
  return `${iso.slice(11, 16)} UTC`
}

/** Local date for the headline, e.g. "Saturday, 6 February 2027". */
export function formatHeadlineDate(iso: string, timeZone?: string): string {
  return formatDate(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, timeZone)
}

/**
 * Headline date without the year, which the headline renders as a picker: "6 February", or "6 Feb" on narrow
 * screens. The weekday goes on its own line (`formatWeekday`), so the date never breaks in the middle.
 */
export function formatDateWithoutYear(iso: string, { short = false } = {}, timeZone?: string): string {
  return formatDate(iso, { day: 'numeric', month: short ? 'short' : 'long' }, timeZone)
}

/** Local date for the arrow targets, e.g. "6 Feb 2027". */
export function formatShortDate(iso: string, timeZone?: string): string {
  return formatDate(iso, { day: 'numeric', month: 'short', year: 'numeric' }, timeZone)
}

/** Local weekday, e.g. "Saturday". */
export function formatWeekday(iso: string, timeZone?: string): string {
  return formatDate(iso, { weekday: 'long' }, timeZone)
}

/** Local 24h time of one of the eclipse's moments, e.g. "12:59", with "(+1)" or "(−1)" when it falls on another local day than the peak. */
export function formatEventTime(iso: string, peakIso: string, timeZone?: string): string {
  const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
  const p = dateParts(iso, options, timeZone)
  const q = dateParts(peakIso, options, timeZone)
  const dayOf = (x: Record<string, string>) => Date.UTC(Number(x.year), Number(x.month) - 1, Number(x.day)) / 86_400_000
  const shift = dayOf(p) - dayOf(q)
  const time = `${p.hour}:${p.minute}`
  return shift === 0 ? time : `${time} (${shift > 0 ? '+' : '−'}${Math.abs(shift)})`
}

/** The viewer's offset at that moment, e.g. "UTC−3", "UTC+5:30" or "UTC". */
export function utcOffsetLabel(iso: string, timeZone?: string): string {
  const name = dateParts(iso, { timeZoneName: 'shortOffset' }, timeZone).timeZoneName ?? 'GMT'
  const offset = name.replace(/^(GMT|UTC)/, '')
  // Some ICU builds write a zero offset as "GMT+0" instead of "GMT".
  if (/^([+-]0(:00)?)?$/.test(offset)) return 'UTC'
  return `UTC${offset.replace('-', '−')}`
}

/** 383 -> "6m 23s". Returns null when there is no duration. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

const SPAN_UNITS = [
  ['span.year', 365.25 * 86_400_000],
  ['span.month', 30.44 * 86_400_000],
  ['span.day', 86_400_000],
  ['span.hour', 3_600_000],
  ['span.minute', 60_000],
] as const

/** A time span in its largest whole unit: "73 years", "1 month", "5 hours". Under a minute is "a moment". */
export function formatSpan(ms: number): string {
  for (const [key, size] of SPAN_UNITS) {
    const n = Math.floor(Math.abs(ms) / size)
    if (n >= 1) return t(key, { n })
  }
  return t('span.moment')
}

const YEAR = 365.25 * 86_400_000
const MONTH = 30.44 * 86_400_000

/** Spans of a year or more in years and months ("17 years, 10 months"); shorter ones as `formatSpan`. */
export function formatLongSpan(ms: number): string {
  const years = Math.floor(Math.abs(ms) / YEAR)
  if (years < 1) return formatSpan(ms)
  const months = Math.floor((Math.abs(ms) - years * YEAR) / MONTH)
  const y = t('span.year', { n: years })
  return months ? t('span.yearsAndMonths', { years: y, months: t('span.month', { n: months }) }) : y
}

/** Time left to the peak or end of a happening eclipse: "1 h 12 min", or "12 min" under an hour. */
export function formatEndsIn({ days, hours, minutes }: Remaining): string {
  const h = days * 24 + hours
  return h > 0 ? t('span.hoursMinutes', { h, m: minutes }) : t('span.minutes', { m: minutes })
}

/** A distance as people plan by it: tens of km under 1,000, hundreds above. "180 km", "7,000 km". */
export function formatKm(km: number): string {
  const step = km < 1000 ? 10 : 100
  return new Intl.NumberFormat(intlLocale(), { style: 'unit', unit: 'kilometer' }).format(Math.round(km / step) * step)
}

export function formatMagnitude(value: number): string {
  return new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: 3, maximumFractionDigits: 3 }).format(value)
}
