// Spot checks that Spanish reads naturally where grammar is assembled: dates, plurals, joined regions,
// word order in names. The catalog test covers completeness; these cover the code that feeds the messages.

import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { answerCard, formatCoords, verdictMessage } from '../components/YourLocation'
import { eclipseName, formatHeadlineDate, formatKm, formatLongSpan, formatMagnitude, formatShortDate } from '../components/format'
import type { EclipseGeometry, EclipseSummary } from '../data/types'
import { describeVisibility } from '../globe/describe'
import { buildMeta } from '../share/meta'
import { switchLocale } from '.'

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

const YEAR = 365.25 * 86_400_000

beforeAll(() => switchLocale('es'))
afterAll(() => switchLocale('en'))

describe('Spanish', () => {
  it('writes dates and numbers the Spanish way', () => {
    expect(formatHeadlineDate(ECLIPSE.peakUtc, 'UTC')).toBe('miércoles, 12 de agosto de 2026')
    expect(formatShortDate(ECLIPSE.peakUtc, 'UTC')).toBe('12 ago 2026')
    // Latin American Spanish (es-419) uses a decimal point, unlike Spain.
    expect(formatMagnitude(1.0386)).toBe('1.039')
    expect(formatKm(7028)).toBe('7,000 km')
  })

  it('puts the adjectives after "eclipse"', () => {
    expect(eclipseName(ECLIPSE)).toBe('Eclipse solar total')
    expect(eclipseName({ type: 'lunar', kind: 'penumbral' })).toBe('Eclipse lunar penumbral')
  })

  it('pluralizes spans', () => {
    expect(formatLongSpan(YEAR + 31 * 86_400_000)).toBe('1 año y 1 mes')
    expect(formatLongSpan(17 * YEAR + 10.5 * 30.44 * 86_400_000)).toBe('17 años y 10 meses')
  })

  it('joins regions and agrees the verb with them', () => {
    const geometry = {
      features: {
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: { zone: 'centerline' }, geometry: { type: 'LineString', coordinates: [[-60, -20], [10, 10]] } }],
      },
    } as unknown as EclipseGeometry
    expect(describeVisibility(ECLIPSE, geometry, 'past')).toBe(
      'La franja de totalidad cruzó América del Sur y África; una zona mucho más amplia vio un eclipse parcial.',
    )
  })

  it('tells the viewer where the path is, with Spanish compass points', () => {
    const verdict = { kind: 'near-path', toPath: { km: 180.6, direction: 'south-west', to: { lat: 0, lng: 0 } } } as const
    expect(verdictMessage(ECLIPSE, verdict, 'future')).toBe(
      'La franja de totalidad está a 180 km al suroeste de ti. Probablemente se vea un eclipse parcial desde aquí.',
    )
    expect(answerCard(ECLIPSE, verdict, 'future').title).toBe('180 km al suroeste')
    expect(formatCoords({ lat: -34.6037, lng: -58.3816 })).toBe('34.6°S 58.4°O')
  })

  it('writes the link preview in Spanish', () => {
    const meta = buildMeta(ECLIPSE, 'https://x.test', '/')
    expect(meta.title).toBe('Eclipse solar total · miércoles, 12 de agosto de 2026')
    expect(meta.description).toBe(
      'Eclipse solar total el miércoles, 12 de agosto de 2026. Magnitud 1.039 · Hasta 2m 18s · Saros 126. Cuenta regresiva y dónde se puede ver.',
    )
    expect(meta.url).toBe('https://x.test/es/e/2026-08-12-solar/')
    // One card for every language.
    expect(meta.image).toBe('https://x.test/og/2026-08-12-solar.png')
  })
})
