import { describe, expect, it } from 'vitest'
import {
  formatDateWithoutYear,
  formatDuration,
  formatEndsIn,
  formatShortDate,
  formatSpan,
  formatHeadlineDate,
  formatLocalShort,
  formatMagnitude,
  formatUtc,
  formatUtcTime,
  formatWeekday,
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

describe('formatDateWithoutYear', () => {
  it('writes the long and short forms', () => {
    expect(formatDateWithoutYear(PEAK, {}, 'UTC')).toBe('6 February')
    expect(formatDateWithoutYear(PEAK, { short: true }, 'UTC')).toBe('6 Feb')
  })
})

describe('formatShortDate', () => {
  it('writes the day, short month and year, for the arrow targets', () => {
    expect(formatShortDate(PEAK, 'UTC')).toBe('6 Feb 2027')
    // The local date, not the UTC one.
    expect(formatShortDate('2027-02-20T23:12:50Z', 'Asia/Tokyo')).toBe('21 Feb 2027')
  })
})

describe('formatWeekday', () => {
  it('writes the full weekday in the viewer time zone', () => {
    expect(formatWeekday(PEAK, 'UTC')).toBe('Saturday')
    // 23:12 UTC on a Saturday is already Sunday east of UTC+1.
    expect(formatWeekday('2027-02-20T23:12:50Z', 'Asia/Tokyo')).toBe('Sunday')
  })
})

describe('formatSpan', () => {
  const DAY = 86_400_000
  it('uses the largest whole unit, singular or plural', () => {
    expect(formatSpan(73.4 * 365.25 * DAY)).toBe('73 years')
    expect(formatSpan(366 * DAY)).toBe('1 year')
    expect(formatSpan(45 * DAY)).toBe('1 month')
    expect(formatSpan(3 * DAY)).toBe('3 days')
    expect(formatSpan(5 * 3_600_000)).toBe('5 hours')
    expect(formatSpan(90_000)).toBe('1 minute')
    expect(formatSpan(10_000)).toBe('a moment')
  })

  it('ignores the sign', () => {
    expect(formatSpan(-3 * DAY)).toBe('3 days')
  })
})

describe('formatEndsIn', () => {
  it('shows hours and minutes, or minutes alone', () => {
    expect(formatEndsIn({ days: 0, hours: 1, minutes: 12, seconds: 5 })).toBe('1 h 12 min')
    expect(formatEndsIn({ days: 0, hours: 0, minutes: 12, seconds: 5 })).toBe('12 min')
  })
})
