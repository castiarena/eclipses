import type { EclipseKind, EclipseType } from '../data/types'

export const TYPE_LABEL: Record<EclipseType, string> = {
  solar: 'Solar',
  lunar: 'Lunar',
}

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
  return name.replace('GMT', 'UTC').replace('-', '−')
}

/** 383 -> "6m 23s". Returns null when there is no duration. */
export function formatDuration(seconds: number | null): string | null {
  if (seconds === null) return null
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
}

export function formatMagnitude(value: number): string {
  return value.toFixed(3)
}
