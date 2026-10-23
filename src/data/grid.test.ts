import { describe, expect, it } from 'vitest'
import { decodeGrid, encodeGrid, type GridPoint } from './grid'

const zones = { 1: 'partial', 2: 'full' }

describe('encodeGrid / decodeGrid', () => {
  it('round-trips sparse points, including the corners and poles', () => {
    const points: GridPoint[] = [
      [-90, -180, 1],
      [-90, 177, 2],
      [0, 0, 2],
      [42, -15, 1],
      [90, -180, 2],
      [90, 177, 1],
    ]
    const packed = encodeGrid(points, 3, zones)
    expect(packed.cells).toHaveLength(61 * 120)
    expect(decodeGrid(packed)).toEqual(points)
  })

  it('round-trips a dense grid on a different step', () => {
    const points: GridPoint[] = []
    for (let lat = -90; lat <= 90; lat += 10) {
      for (let lon = -180; lon < 180; lon += 10) points.push([lat, lon, ((lat + lon) / 10) % 2 ? 1 : 2])
    }
    expect(decodeGrid(encodeGrid(points, 10, zones))).toEqual(points)
  })

  it('rejects zone codes that need more than one digit', () => {
    expect(() => encodeGrid([[0, 0, 10]], 3, zones)).toThrow()
  })
})
