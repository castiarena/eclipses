import { describe, expect, it } from 'vitest'
import { remainingUntil } from './countdown'

describe('remainingUntil', () => {
  it('splits the difference into days, hours, minutes and seconds', () => {
    const now = Date.parse('2027-02-01T00:00:00Z')
    const peak = now + (2 * 86400 + 3 * 3600 + 4 * 60 + 5) * 1000
    expect(remainingUntil(peak, now)).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5 })
  })

  it('returns null once the peak has passed or is exactly now', () => {
    const peak = Date.parse('2027-02-06T15:59:32Z')
    expect(remainingUntil(peak, peak)).toBeNull()
    expect(remainingUntil(peak, peak + 1000)).toBeNull()
  })
})
