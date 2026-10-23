import type { Region } from './layers'

/** A lon/lat rectangle (as `gridRegions` makes them) in pixels on an equirectangular canvas of `width` × `height`. */
export function pixelRect(ring: number[][], width: number, height: number) {
  const lons = ring.map(([lon]) => lon)
  const lats = ring.map(([, lat]) => lat)
  const x = ((Math.min(...lons) + 180) / 360) * width
  const y = ((90 - Math.max(...lats)) / 180) * height
  return {
    x,
    y,
    w: ((Math.max(...lons) + 180) / 360) * width - x,
    h: ((90 - Math.min(...lats)) / 180) * height - y,
  }
}

export interface ZoneStyle {
  wholeFill: string
  partFill: string
  hatch: string
}

/**
 * Paints the lunar zones onto an equirectangular canvas: "whole" as a solid tint, "part" as a fainter tint
 * crossed by diagonal hatching, so the two differ in pattern as well as lightness. Everything else stays
 * transparent, letting the Earth show through.
 */
export function paintZones(ctx: CanvasRenderingContext2D, zones: Region[], style: ZoneStyle) {
  const { width, height } = ctx.canvas
  ctx.clearRect(0, 0, width, height)

  // Both edges of a cell snap to the same pixel grid, so neighbouring cells meet exactly: no hairline gaps,
  // and no overlaps that would double the translucent fill into stripes.
  const cell = (z: Region) => {
    const r = pixelRect(z.geometry.coordinates[0], width, height)
    const x = Math.round(r.x)
    const y = Math.round(r.y)
    return [x, y, Math.round(r.x + r.w) - x, Math.round(r.y + r.h) - y] as const
  }

  ctx.fillStyle = style.wholeFill
  for (const z of zones) if (z.zone === 'full') ctx.fillRect(...cell(z))

  const part = zones.filter((z) => z.zone === 'partial')
  if (!part.length) return
  ctx.save()
  ctx.beginPath()
  for (const z of part) ctx.rect(...cell(z))
  ctx.clip()
  ctx.fillStyle = style.partFill
  ctx.fillRect(0, 0, width, height)
  ctx.strokeStyle = style.hatch
  ctx.lineWidth = Math.max(1.5, width / 1400)
  const gap = width / 180
  ctx.beginPath()
  for (let x = -height; x < width; x += gap) {
    ctx.moveTo(x, height)
    ctx.lineTo(x + height, 0)
  }
  ctx.stroke()
  ctx.restore()
}
