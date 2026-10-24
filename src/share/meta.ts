import { eclipseName, formatDuration, formatHeadlineDate, formatMagnitude } from '../components/format'
import type { EclipseSummary } from '../data/types'
import { currentLocale, t } from '../i18n'
import { ALL_LOCALES, DEFAULT_LOCALE, LOCALES, type Locale } from '../i18n/locales'
import { eclipsePath, localeBase } from './url'

export { eclipseName }

// Read at import, so in English: the OG cards are drawn once for every language.
export const SITE_NAME = t('site.name')

export interface EclipseMeta {
  title: string
  description: string
  /** Absolute URL of the eclipse's page. */
  url: string
  /** Absolute URL of its 1200x630 card. */
  image: string
  imageAlt: string
}

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }

/** Path of an eclipse's card under `base`. */
export const ogImagePath = (id: string, base = '/') => `${base.endsWith('/') ? base : `${base}/`}og/${id}.png`

/**
 * Link-preview text for one eclipse, in the current locale. Dates are UTC and timeless ("on", not "in 3 days"),
 * since the page is rendered once at build and read long after. `base` is the app's: the page URL gets the
 * locale's prefix, while the card is shared by every language.
 */
export function buildMeta(eclipse: EclipseSummary, origin: string, base = '/'): EclipseMeta {
  const date = formatHeadlineDate(eclipse.peakUtc, 'UTC')
  const name = eclipseName(eclipse)
  const duration = formatDuration(eclipse.durationSec)
  const facts = [
    t('meta.magnitude', { value: formatMagnitude(eclipse.magnitude) }),
    duration && t('meta.upTo', { duration }),
    t('eclipse.saros', { saros: eclipse.saros }),
  ]
  return {
    title: t('meta.title', { name, date }),
    description: t('meta.description', { name, date, facts: facts.filter(Boolean).join(' · ') }),
    url: `${origin}${eclipsePath(eclipse.id, localeBase(currentLocale(), base))}`,
    image: `${origin}${ogImagePath(eclipse.id, base)}`,
    imageAlt: t('meta.imageAlt', { name, date }),
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c])

/** The same page's URL in each locale, for hreflang links. */
export type Alternates = Record<Locale, string>

/**
 * The `<head>` tags for a link preview, in the current locale: title, description, canonical, Open Graph and
 * Twitter card, plus links to the page in the other languages when `alternates` is given.
 */
export function metaTags(m: { title: string; description: string; url: string; image: string; imageAlt: string }, alternates?: Alternates): string {
  const e = escapeHtml
  const prop = (k: string, v: string | number) => `    <meta property="${k}" content="${e(String(v))}" />`
  const name = (k: string, v: string) => `    <meta name="${k}" content="${e(v)}" />`
  const hreflang = (lang: string, url: string) => `    <link rel="alternate" hreflang="${lang}" href="${e(url)}" />`
  const locale = currentLocale()
  const others = ALL_LOCALES.filter((l) => l !== locale)
  return [
    `    <title>${e(m.title)}</title>`,
    name('description', m.description),
    `    <link rel="canonical" href="${e(m.url)}" />`,
    ...(alternates ? [...ALL_LOCALES.map((l) => hreflang(l, alternates[l])), hreflang('x-default', alternates[DEFAULT_LOCALE])] : []),
    prop('og:type', 'website'),
    prop('og:site_name', t('site.name')),
    prop('og:locale', LOCALES[locale].og),
    ...others.map((l) => prop('og:locale:alternate', LOCALES[l].og)),
    prop('og:title', m.title),
    prop('og:description', m.description),
    prop('og:url', m.url),
    prop('og:image', m.image),
    prop('og:image:width', OG_IMAGE_SIZE.width),
    prop('og:image:height', OG_IMAGE_SIZE.height),
    prop('og:image:alt', m.imageAlt),
    name('twitter:card', 'summary_large_image'),
    name('twitter:title', m.title),
    name('twitter:description', m.description),
    name('twitter:image', m.image),
    name('twitter:image:alt', m.imageAlt),
  ].join('\n')
}
