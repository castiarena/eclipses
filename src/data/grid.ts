// Compact on-disk form of the lunar visibility grid: one character per cell,
// row-major from the south-west corner ('0' = not visible, else the zone code).
// Imported by scripts/build-eclipse-data.ts too, so keep it dependency-free.

export type GridPoint = [lat: number, lon: number, zone: number]

export interface PackedGrid {
  step: number
  zones: Record<string, string>
  origin: [lat: number, lon: number]
  cells: string
}

const ORIGIN: [number, number] = [-90, -180]

const columns = (step: number) => Math.round(360 / step)
const rows = (step: number) => Math.round(180 / step) + 1

/** Packs sparse grid points (lat -90..90, lon -180..<180, on `step`) into a cell string. */
export function encodeGrid(points: GridPoint[], step: number, zones: Record<string, string>): PackedGrid {
  const cols = columns(step)
  const cells = new Array<string>(rows(step) * cols).fill('0')
  for (const [lat, lon, zone] of points) {
    if (zone < 1 || zone > 9) throw new Error(`zone ${zone} does not fit in one digit`)
    const row = Math.round((lat - ORIGIN[0]) / step)
    const col = Math.round((lon - ORIGIN[1]) / step)
    cells[row * cols + col] = String(zone)
  }
  return { step, zones, origin: ORIGIN, cells: cells.join('') }
}

/** Expands a packed grid back to the sparse points the globe and lookups use. */
export function decodeGrid({ step, origin, cells }: PackedGrid): GridPoint[] {
  const cols = columns(step)
  const points: GridPoint[] = []
  for (let i = 0; i < cells.length; i++) {
    const zone = cells.charCodeAt(i) - 48
    if (zone === 0) continue
    const row = Math.floor(i / cols)
    const col = i % cols
    points.push([origin[0] + row * step, origin[1] + col * step, zone])
  }
  return points
}
