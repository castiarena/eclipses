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

/** "2027-02-06T15:59:32Z" -> "2027-02-06 15:59 UTC" */
export function formatUtc(iso: string): string {
  return `${iso.slice(0, 10)} ${iso.slice(11, 16)} UTC`
}

/** Local date, time and zone name, e.g. "Saturday, February 6, 2027, 12:59 PM GMT-3". */
export function formatLocal(iso: string, locale?: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
    timeZone,
  }).format(new Date(iso))
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
