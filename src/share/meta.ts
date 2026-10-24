import { formatDuration, formatHeadlineDate, formatMagnitude, KIND_LABEL, TYPE_LABEL } from '../components/format'
import type { EclipseSummary } from '../data/types'
import { eclipsePath } from './url'

export const SITE_NAME = 'Next eclipse'
export const SITE_DESCRIPTION = 'Countdown to the next solar and lunar eclipse, and a 3D globe of where each one can be seen.'

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

/** "Total solar eclipse" */
export function eclipseName(eclipse: Pick<EclipseSummary, 'kind' | 'type'>): string {
  return `${KIND_LABEL[eclipse.kind]} ${TYPE_LABEL[eclipse.type].toLowerCase()} eclipse`
}

/** Path of an eclipse's card under `base`. */
export const ogImagePath = (id: string, base = '/') => `${base.endsWith('/') ? base : `${base}/`}og/${id}.png`

/**
 * Link-preview text for one eclipse. Dates are UTC and timeless ("on", not "in 3 days"),
 * since the page is rendered once at build and read long after.
 */
export function buildMeta(eclipse: EclipseSummary, origin: string, base = '/'): EclipseMeta {
  const date = formatHeadlineDate(eclipse.peakUtc, 'UTC')
  const name = eclipseName(eclipse)
  const duration = formatDuration(eclipse.durationSec)
  const facts = [`Magnitude ${formatMagnitude(eclipse.magnitude)}`, duration && `Up to ${duration}`, `Saros ${eclipse.saros}`]
  return {
    title: `${name} · ${date}`,
    description: `${name} on ${date}. ${facts.filter(Boolean).join(' · ')}. Countdown and where it can be seen.`,
    url: `${origin}${eclipsePath(eclipse.id, base)}`,
    image: `${origin}${ogImagePath(eclipse.id, base)}`,
    imageAlt: `${name} on ${date}`,
  }
}

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }
export const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c])

/** The `<head>` tags for a link preview: title, description, canonical, Open Graph and Twitter card. */
export function metaTags(m: { title: string; description: string; url: string; image: string; imageAlt: string }): string {
  const t = escapeHtml
  const prop = (k: string, v: string | number) => `    <meta property="${k}" content="${t(String(v))}" />`
  const name = (k: string, v: string) => `    <meta name="${k}" content="${t(v)}" />`
  return [
    `    <title>${t(m.title)}</title>`,
    name('description', m.description),
    `    <link rel="canonical" href="${t(m.url)}" />`,
    prop('og:type', 'website'),
    prop('og:site_name', SITE_NAME),
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
