import { describe, expect, it } from 'vitest'
import { snapOpen } from './MobileSheet'

// Positive drag is downwards; travel is the distance between the peek and expanded heights.
const TRAVEL = 400

describe('snapOpen', () => {
  it('follows a flick, whichever state it started in', () => {
    expect(snapOpen({ wasOpen: false, dragPx: -20, velocity: -0.8, travelPx: TRAVEL })).toBe(true)
    expect(snapOpen({ wasOpen: true, dragPx: 20, velocity: 0.8, travelPx: TRAVEL })).toBe(false)
  })

  it('otherwise snaps to whichever state is nearer when let go', () => {
    expect(snapOpen({ wasOpen: false, dragPx: -150, velocity: 0, travelPx: TRAVEL })).toBe(false)
    expect(snapOpen({ wasOpen: false, dragPx: -250, velocity: 0, travelPx: TRAVEL })).toBe(true)
    expect(snapOpen({ wasOpen: true, dragPx: 150, velocity: 0, travelPx: TRAVEL })).toBe(true)
    expect(snapOpen({ wasOpen: true, dragPx: 250, velocity: 0, travelPx: TRAVEL })).toBe(false)
  })

  it('stays put for a drag the wrong way', () => {
    expect(snapOpen({ wasOpen: false, dragPx: 60, velocity: 0.1, travelPx: TRAVEL })).toBe(false)
    expect(snapOpen({ wasOpen: true, dragPx: -60, velocity: -0.1, travelPx: TRAVEL })).toBe(true)
  })
})
