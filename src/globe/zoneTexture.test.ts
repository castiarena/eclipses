import { describe, expect, it } from 'vitest'
import { pixelRect } from './zoneTexture'

// A clockwise lon/lat rectangle, as gridRegions makes them.
const ring = (w: number, s: number, e: number, n: number) => [
  [w, s],
  [w, n],
  [e, n],
  [e, s],
  [w, s],
]

describe('pixelRect', () => {
  it('maps lon/lat onto an equirectangular canvas, north up and -180° at the left', () => {
    expect(pixelRect(ring(-180, 0, 0, 90), 360, 180)).toEqual({ x: 0, y: 0, w: 180, h: 90 })
    const cell = pixelRect(ring(-1.5, -1.5, 7.5, 1.5), 3600, 1800)
    expect(cell.x).toBeCloseTo(1785)
    expect(cell.y).toBeCloseTo(885)
    expect(cell.w).toBeCloseTo(90)
    expect(cell.h).toBeCloseTo(30)
  })
})
