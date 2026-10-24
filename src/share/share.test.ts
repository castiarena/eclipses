import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import { buildMeta, escapeHtml, metaTags } from './meta'
import { shareIntentUrl } from './targets'
import { eclipsePath, localeBase, localeFromPath, parseEclipseId, pathInLocale, shareUrl, typeOfId } from './url'

const ECLIPSE: EclipseSummary = {
  id: '2026-08-12-solar',
  type: 'solar',
  kind: 'total',
  peakUtc: '2026-08-12T17:46:06Z',
  startUtc: '2026-08-12T15:16:06Z',
  endUtc: '2026-08-12T20:16:06Z',
  magnitude: 1.0386,
  gamma: 0.898,
  saros: 126,
  durationSec: 138,
  hasGeometry: true,
}

describe('eclipse urls', () => {
  it('builds the path under the base', () => {
    expect(eclipsePath('2026-08-12-solar')).toBe('/e/2026-08-12-solar/')
    expect(eclipsePath('2026-08-12-solar', '/eclipses/')).toBe('/eclipses/e/2026-08-12-solar/')
    expect(eclipsePath('2026-08-12-solar', '/eclipses')).toBe('/eclipses/e/2026-08-12-solar/')
  })

  it('builds the absolute share url', () => {
    expect(shareUrl('https://castiarena.github.io', '2026-08-12-solar', '/eclipses/')).toBe(
      'https://castiarena.github.io/eclipses/e/2026-08-12-solar/',
    )
  })

  it('reads the id back, with or without the trailing slash', () => {
    expect(parseEclipseId('/eclipses/e/2026-08-12-solar/', '/eclipses/')).toBe('2026-08-12-solar')
    expect(parseEclipseId('/eclipses/e/2027-02-20-lunar', '/eclipses/')).toBe('2027-02-20-lunar')
  })

  it('ignores other paths and malformed ids', () => {
    expect(parseEclipseId('/eclipses/', '/eclipses/')).toBeNull()
    expect(parseEclipseId('/e/2026-08-12-solar/', '/eclipses/')).toBeNull()
    expect(parseEclipseId('/e/nonsense/')).toBeNull()
    expect(parseEclipseId('/e/2026-08-12-solar/extra/')).toBeNull()
  })

  it('puts every locale but English under its own prefix', () => {
    expect(localeBase('en', '/eclipses/')).toBe('/eclipses/')
    expect(localeBase('es', '/eclipses/')).toBe('/eclipses/es/')
    expect(eclipsePath('2026-08-12-solar', localeBase('es', '/eclipses/'))).toBe('/eclipses/es/e/2026-08-12-solar/')
  })

  it('reads the locale from the path', () => {
    expect(localeFromPath('/eclipses/es/e/2026-08-12-solar/', '/eclipses/')).toBe('es')
    expect(localeFromPath('/eclipses/es', '/eclipses/')).toBe('es')
    expect(localeFromPath('/eclipses/e/2026-08-12-solar/', '/eclipses/')).toBe('en')
    expect(localeFromPath('/eclipses/xx/', '/eclipses/')).toBe('en')
    expect(localeFromPath('/es/', '/eclipses/')).toBe('en')
  })

  it('moves a page to another locale, keeping the eclipse', () => {
    expect(pathInLocale('/eclipses/e/2026-08-12-solar/', 'es', '/eclipses/')).toBe('/eclipses/es/e/2026-08-12-solar/')
    expect(pathInLocale('/eclipses/es/e/2026-08-12-solar/', 'en', '/eclipses/')).toBe('/eclipses/e/2026-08-12-solar/')
    expect(pathInLocale('/eclipses/es', 'en', '/eclipses/')).toBe('/eclipses/')
    expect(pathInLocale('/', 'es')).toBe('/es/')
  })

  it('names the type an id carries', () => {
    expect(typeOfId('2027-02-20-lunar')).toBe('lunar')
    expect(typeOfId('2026-08-12-solar')).toBe('solar')
  })
})

describe('buildMeta', () => {
  const meta = buildMeta(ECLIPSE, 'https://castiarena.github.io', '/eclipses/')

  it('titles with the kind and the UTC date', () => {
    expect(meta.title).toBe('Total solar eclipse · Wednesday, 12 August 2026')
  })

  it('describes the facts that exist', () => {
    expect(meta.description).toContain('Magnitude 1.039')
    expect(meta.description).toContain('Up to 2m 18s')
    expect(meta.description).toContain('Saros 126')
  })

  it('leaves out the duration when there is none', () => {
    expect(buildMeta({ ...ECLIPSE, durationSec: null }, 'https://x.test').description).not.toContain('Up to')
  })

  it('points at the page and its card', () => {
    expect(meta.url).toBe('https://castiarena.github.io/eclipses/e/2026-08-12-solar/')
    expect(meta.image).toBe('https://castiarena.github.io/eclipses/og/2026-08-12-solar.png')
  })
})

describe('metaTags', () => {
  it('escapes values', () => {
    expect(escapeHtml('a "b" <c> & d')).toBe('a &quot;b&quot; &lt;c&gt; &amp; d')
    const tags = metaTags({ title: 'A "q" & <b>', description: 'd', url: 'u', image: 'i', imageAlt: 'a' })
    expect(tags).toContain('content="A &quot;q&quot; &amp; &lt;b&gt;"')
  })

  it('includes the Open Graph and Twitter essentials', () => {
    const tags = metaTags(buildMeta(ECLIPSE, 'https://x.test'))
    for (const key of ['og:title', 'og:description', 'og:url', 'og:image', 'og:image:width', 'twitter:card', 'twitter:image']) {
      expect(tags).toContain(key)
    }
    expect(tags).toContain('content="summary_large_image"')
    expect(tags).toContain('rel="canonical"')
    expect(tags).toContain('<meta property="og:locale" content="en_GB" />')
  })

  it('links the page in every language when given its alternates', () => {
    const tags = metaTags(buildMeta(ECLIPSE, 'https://x.test'), { en: 'https://x.test/e/a/', es: 'https://x.test/es/e/a/' })
    expect(tags).toContain('<link rel="alternate" hreflang="en" href="https://x.test/e/a/" />')
    expect(tags).toContain('<link rel="alternate" hreflang="es" href="https://x.test/es/e/a/" />')
    expect(tags).toContain('<link rel="alternate" hreflang="x-default" href="https://x.test/e/a/" />')
    expect(tags).toContain('<meta property="og:locale:alternate" content="es_LA" />')
  })
})

describe('shareIntentUrl', () => {
  const url = 'https://x.test/e/2026-08-12-solar/'
  it('encodes each network', () => {
    expect(shareIntentUrl('whatsapp', 'Look & see', url)).toBe(
      `https://wa.me/?text=${encodeURIComponent(`Look & see ${url}`)}`,
    )
    expect(shareIntentUrl('facebook', 'ignored', url)).toBe(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    )
    expect(shareIntentUrl('x', 'Look & see', url)).toBe(
      `https://twitter.com/intent/tweet?text=Look%20%26%20see&url=${encodeURIComponent(url)}`,
    )
  })
})
