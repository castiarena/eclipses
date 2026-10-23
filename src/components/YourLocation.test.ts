import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import type { LocationVerdict } from '../globe/distance'
import { answerCard, formatCoords, verdictMessage } from './YourLocation'

const annular = { type: 'solar', kind: 'annular' } as EclipseSummary
const total = { type: 'solar', kind: 'total' } as EclipseSummary
const lunar = { type: 'lunar', kind: 'penumbral' } as EclipseSummary

const VERDICTS: [EclipseSummary, LocationVerdict][] = [
  [annular, { kind: 'in-path', toCentre: { km: 42, direction: 'west', to: { lat: 0, lng: 0 } } }],
  [annular, { kind: 'in-path', toCentre: null }],
  [annular, { kind: 'near-path', toPath: { km: 180.6, direction: 'south-east', to: { lat: 0, lng: 0 } } }],
  [annular, { kind: 'far-from-path', toPath: { km: 7028, direction: 'north', to: { lat: 0, lng: 0 } } }],
  [lunar, { kind: 'whole' }],
  [lunar, { kind: 'part' }],
  [lunar, { kind: 'not-visible' }],
  [annular, { kind: 'unknown' }],
  [annular, { kind: 'no-map' }],
]

describe('verdictMessage', () => {
  it('has a future, present and past message for every verdict', () => {
    for (const [eclipse, verdict] of VERDICTS) {
      const future = verdictMessage(eclipse, verdict, 'future')
      expect(future, verdict.kind).toBeTruthy()
      expect(verdictMessage(eclipse, verdict, 'present'), verdict.kind).toBeTruthy()
      expect(verdictMessage(eclipse, verdict, 'past'), verdict.kind).toBeTruthy()
    }
  })

  it('gives the distance and direction to the path', () => {
    expect(verdictMessage(annular, VERDICTS[2][1], 'future')).toBe(
      'The path of annularity is 180 km south-east of you. A partial eclipse is likely visible from here.',
    )
    expect(verdictMessage(annular, VERDICTS[3][1], 'past')).toBe(
      'The path of annularity was 7,000 km north of you. A partial eclipse may have been visible; partial zones are not mapped.',
    )
  })

  it('names the path by the kind of eclipse, and the centre line when inside', () => {
    expect(verdictMessage(total, VERDICTS[0][1], 'future')).toBe(
      'Your location is in the path of totality, 40 km from the centre line.',
    )
    expect(verdictMessage(total, { kind: 'in-path', toCentre: { km: 3, direction: 'east', to: { lat: 0, lng: 0 } } }, 'future')).toBe(
      'Your location is in the path of totality, right by the centre line.',
    )
  })

  it('keeps the lunar answers in the right tense', () => {
    expect(verdictMessage(lunar, { kind: 'whole' }, 'past')).toBe('The Moon was up for the whole eclipse from your location.')
    expect(verdictMessage(lunar, { kind: 'not-visible' }, 'future')).toBe('The Moon is below the horizon from your location.')
  })
})

describe('answerCard', () => {
  it('leads with a verdict and the one number that matters', () => {
    expect(answerCard(annular, VERDICTS[2][1], 'future')).toMatchObject({ badge: 'Near the path', title: '180 km south-east' })
    expect(answerCard(annular, VERDICTS[3][1], 'future')).toMatchObject({ badge: 'Far from the path', title: '7,000 km north' })
    expect(answerCard(total, VERDICTS[0][1], 'future')).toMatchObject({ badge: 'In the path', title: "You'll see totality" })
    expect(answerCard(total, VERDICTS[0][1], 'past')).toMatchObject({ title: 'You were in totality' })
  })

  it('gives lunar eclipses a verdict only', () => {
    expect(answerCard(lunar, { kind: 'whole' }, 'future')).toMatchObject({ badge: 'The whole eclipse', title: 'Moon up start to end' })
    expect(answerCard(lunar, { kind: 'part' }, 'future')).toMatchObject({ badge: 'Part of it' })
    expect(answerCard(lunar, { kind: 'not-visible' }, 'future')).toMatchObject({ badge: 'Not visible', title: 'Moon below your horizon' })
  })

  it('reuses the full sentence as the body', () => {
    for (const [eclipse, verdict] of VERDICTS) {
      expect(answerCard(eclipse, verdict, 'future').body).toBe(verdictMessage(eclipse, verdict, 'future'))
    }
  })
})

describe('formatCoords', () => {
  it('writes hemispheres instead of signs, to one decimal', () => {
    expect(formatCoords({ lat: -34.6037, lng: -58.3816 })).toBe('34.6°S 58.4°W')
    expect(formatCoords({ lat: 51.5, lng: 0.12 })).toBe('51.5°N 0.1°E')
  })
})
