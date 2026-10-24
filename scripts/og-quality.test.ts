import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { OG_IMAGE_SIZE } from '../src/share/meta'
import { defaultCard, eclipseCard, encode, renderRaw } from './og-card.mts'
import { readEclipses } from './site.mts'

// Total, annular, partial and hybrid solar; total and penumbral lunar; plus the home page's card.
const IDS = ['2027-08-02-solar', '2001-12-14-solar', '2004-04-19-solar', '2005-04-08-solar', '2001-01-09-lunar', '2001-12-30-lunar']

/** PSNR over RGB, the largest channel error, and how many pixels are off by more than 12. */
function compare(a: Buffer, b: Buffer) {
  let squared = 0
  let max = 0
  let off = 0
  for (let p = 0; p < a.length; p += 4) {
    let worst = 0
    for (let c = 0; c < 3; c++) {
      const d = Math.abs(a[p + c] - b[p + c])
      squared += d * d
      worst = Math.max(worst, d)
    }
    max = Math.max(max, worst)
    if (worst > 12) off++
  }
  return { psnr: 10 * Math.log10((255 * 255) / (squared / ((a.length / 4) * 3))), max, offShare: off / (a.length / 4) }
}

describe('link-preview cards', () => {
  it('stay visually the same as truecolor in a small palette PNG', async () => {
    const eclipses = await readEclipses()
    const nodes = [defaultCard(), ...IDS.map((id) => eclipseCard(eclipses.find((e) => e.id === id)!))]
    let bytes = 0
    for (const node of nodes) {
      const truecolor = await renderRaw(node)
      const png = await encode(truecolor)
      bytes += png.length

      const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
      expect([info.width, info.height]).toEqual([OG_IMAGE_SIZE.width, OG_IMAGE_SIZE.height])
      expect(png[25]).toBe(3) // IHDR colour type 3: indexed palette

      // Measured at quality 99: PSNR 53.7 dB or more, max error 22, at most 0.02% of pixels off by more than 12,
      // all on anti-aliased text edges. The bounds leave headroom for library updates, not for visible change.
      const { psnr, max, offShare } = compare(truecolor, data)
      expect(psnr).toBeGreaterThan(50)
      expect(max).toBeLessThanOrEqual(28)
      expect(offShare).toBeLessThan(0.0005)
    }
    // Truecolor cards were ~140 KB; this fails loudly if the palette encode is lost.
    expect(bytes / nodes.length).toBeLessThan(40_000)
  }, 60_000)
})
