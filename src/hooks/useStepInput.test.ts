import { describe, expect, it } from 'vitest'
import { swipeDirection } from './useStepInput'

describe('swipeDirection', () => {
  it('reads a leftward swipe as later and a rightward one as earlier', () => {
    expect(swipeDirection(-80, 10)).toBe('next')
    expect(swipeDirection(80, -10)).toBe('prev')
  })

  it('ignores short drags', () => {
    expect(swipeDirection(-49, 0)).toBeNull()
  })

  it('ignores drags that are mostly vertical', () => {
    expect(swipeDirection(-80, 60)).toBeNull()
    expect(swipeDirection(90, 59)).toBe('prev')
  })
})
