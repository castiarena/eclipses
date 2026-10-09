import { describe, expect, it } from 'vitest'
import {
  formatDuration,
  formatHeadlineDate,
  formatLocalShort,
  formatMagnitude,
  formatUtc,
  formatUtcTime,
  utcOffsetLabel,
} from './format'

const PEAK = '2027-02-06T15:59:32Z'

describe('formatUtc', () => {
  it('shows date and minute in UTC', () => {
    expect(formatUtc(PEAK)).toBe('2027-02-06 15:59 UTC')
  })

  it('can show the time alone', () => {
    expect(formatUtcTime(PEAK)).toBe('15:59 UTC')
  })
})

describe('formatHeadlineDate', () => {
  it('writes weekday, day, month and year in the requested zone', () => {
    expect(formatHeadlineDate(PEAK, 'UTC')).toBe('Saturday, 6 February 2027')
  })

  it('uses the local date, which can differ from the UTC one', () => {
    expect(formatHeadlineDate('2027-02-20T23:12:00Z', 'Asia/Tokyo')).toBe('Sunday, 21 February 2027')
  })
})

describe('formatLocalShort', () => {
  it('shows a short date and 24h time', () => {
    expect(formatLocalShort(PEAK, {}, 'America/Argentina/Buenos_Aires')).toBe('6 Feb 2027 · 12:59')
  })

  it('can leave out the year', () => {
    expect(formatLocalShort(PEAK, { withYear: false }, 'UTC')).toBe('6 Feb · 15:59')
  })
})

describe('utcOffsetLabel', () => {
  it('names the offset with a true minus sign', () => {
    expect(utcOffsetLabel(PEAK, 'America/Argentina/Buenos_Aires')).toBe('UTC−3')
  })

  it('handles half-hour offsets and UTC itself', () => {
    expect(utcOffsetLabel(PEAK, 'Asia/Kolkata')).toBe('UTC+5:30')
    expect(utcOffsetLabel(PEAK, 'UTC')).toBe('UTC')
  })
})

describe('formatDuration', () => {
  it('formats minutes and zero-padded seconds', () => {
    expect(formatDuration(383)).toBe('6m 23s')
    expect(formatDuration(140)).toBe('2m 20s')
  })

  it('returns null when there is no duration', () => {
    expect(formatDuration(null)).toBeNull()
  })
})

describe('formatMagnitude', () => {
  it('rounds to three decimals', () => {
    expect(formatMagnitude(1.079)).toBe('1.079')
    expect(formatMagnitude(0.9281)).toBe('0.928')
  })
})
