import { describe, expect, it } from 'vitest'
import { formatDuration, formatLocal, formatMagnitude, formatUtc } from './format'

describe('formatUtc', () => {
  it('shows date and minute in UTC', () => {
    expect(formatUtc('2027-02-06T15:59:32Z')).toBe('2027-02-06 15:59 UTC')
  })
})

describe('formatLocal', () => {
  it('formats in the requested time zone', () => {
    const text = formatLocal('2027-02-06T15:59:32Z', 'en-US', 'UTC')
    expect(text).toContain('February 6, 2027')
    expect(text).toContain('3:59')
    expect(text).toContain('UTC')
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
