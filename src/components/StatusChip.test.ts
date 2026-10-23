import { describe, expect, it } from 'vitest'
import { statusChip } from './StatusChip'

describe('statusChip', () => {
  it('names where the eclipse sits relative to now', () => {
    expect(statusChip('upcoming', true).label).toBe('Upcoming')
    expect(statusChip('now', true).label).toBe('Happening now')
    expect(statusChip('past', false).label).toBe('Past')
  })

  it('offers the way back only off the live view', () => {
    expect(statusChip('upcoming', true).returnsToLive).toBe(false)
    expect(statusChip('upcoming', false).returnsToLive).toBe(true)
    expect(statusChip('past', false).returnsToLive).toBe(true)
  })

  it('describes the button for screen readers', () => {
    expect(statusChip('past', false).actionLabel).toBe('Past eclipse. Back to the next eclipse')
    expect(statusChip('upcoming', true).actionLabel).toBeNull()
  })
})
