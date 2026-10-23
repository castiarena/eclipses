import type { EclipseFilter, EclipseKind, EclipseType } from '../data/types'
import type { Remaining } from '../hooks/countdown'

export const TYPE_LABEL: Record<EclipseType, string> = {
  solar: 'Solar',
  lunar: 'Lunar',
}

export const FILTER_LABEL: Record<EclipseFilter, string> = { ...TYPE_LABEL, all: 'All' }

export const KIND_LABEL: Record<EclipseKind, string> = {
  total: 'Total',
  annular: 'Annular',
  hybrid: 'Hybrid',
  partial: 'Partial',
  penumbral: 'Penumbral',
}

/** Legend label for a solar eclipse's central path. */
export const CENTRAL_PATH_LABEL: Partial<Record<EclipseKind, string>> = {
  total: 'Path of totality',
  annular: 'Path of annularity',
  hybrid: 'Path of totality / annularity',
}

// Dates are written the British way ("Saturday, 20 February 2027") to match the design.
const LOCALE = 'en-GB'

function dateParts(iso: string, options: Intl.DateTimeFormatOptions, timeZone?: string) {
  const parts = new Intl.DateTimeFormat(LOCALE, { ...options, timeZone }).formatToParts(new Date(iso))
  return Object.fromEntries(parts.map((p) => [p.type, p.value])) as Record<string, string>
}

/** "2027-02-06T15:59:32Z" -> "2027-02-06 15:59 UTC" */
export function formatUtc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

/** "2027-02-06T15:59:32Z" -> "15:59 UTC" */
export function formatUtcTime(iso: string): string {
  return `${iso.slice(11, 16)} UTC`
}

/** Local date for the headline, e.g. "Saturday, 6 February 2027". */
export function formatHeadlineDate(iso: string, timeZone?: string): string {
  const p = dateParts(iso, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }, timeZone)
  return `${p.weekday}, ${p.day} ${p.month} ${p.year}`
}

/** Headline date without the year, which the headline renders as a picker. "Saturday, 6 February" or "Sat 6 Feb". */
export function formatDateWithoutYear(iso: string, { short = false } = {}, timeZone?: string): string {
  const p = dateParts(iso, { weekday: short ? 'short' : 'long', day: 'numeric', month: short ? 'short' : 'long' }, timeZone)
  return short ? `${p.weekday} ${p.day} ${p.month}` : `${p.weekday}, ${p.day} ${p.month}`
}

/** Local date and 24h time, e.g. "6 Feb 2027 · 12:59", or "6 Feb · 12:59" without the year. */
export function formatLocalShort(iso: string, { withYear = true } = {}, timeZone?: string): string {
  const p = dateParts(
    iso,
    { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' },
    timeZone,
  )
  const date = withYear ? `${p.day} ${p.month} ${p.year}` : `${p.day} ${p.month}`
  return `${date} · ${p.hour}:${p.minute}`
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

const SPAN_UNITS: [name: string, ms: number][] = [
  ['year', 365.25 * 86_400_000],
  ['month', 30.44 * 86_400_000],
  ['day', 86_400_000],
  ['hour', 3_600_000],
  ['minute', 60_000],
]

/** A time span in its largest whole unit: "73 years", "1 month", "5 hours". Under a minute is "a moment". */
export function formatSpan(ms: number): string {
  for (const [name, size] of SPAN_UNITS) {
    const n = Math.floor(Math.abs(ms) / size)
    if (n >= 1) return `${n} ${name}${n === 1 ? '' : 's'}`
  }
  return 'a moment'
}

/** Time left in a happening eclipse: "1 h 12 min", or "12 min" under an hour. */
export function formatEndsIn({ days, hours, minutes }: Remaining): string {
  const h = days * 24 + hours
  return h > 0 ? `${h} h ${minutes} min` : `${minutes} min`
}

export function formatMagnitude(value: number): string {
  return value.toFixed(3)
}
