import { describe, expect, it } from 'vitest'
import type { EclipseSummary } from '../data/types'
import type { LocationVerdict } from '../globe/distance'
import { verdictMessage } from './YourLocation'

const annular = { type: 'solar', kind: 'annular' } as EclipseSummary
const total = { type: 'solar', kind: 'total' } as EclipseSummary
const lunar = { type: 'lunar', kind: 'penumbral' } as EclipseSummary

const VERDICTS: [EclipseSummary, LocationVerdict][] = [
  [annular, { kind: 'in-path', toCentre: { km: 42, direction: 'west' } }],
  [annular, { kind: 'in-path', toCentre: null }],
  [annular, { kind: 'near-path', toPath: { km: 180.6, direction: 'south-east' } }],
  [annular, { kind: 'far-from-path', toPath: { km: 7028, direction: 'north' } }],
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
    expect(verdictMessage(total, { kind: 'in-path', toCentre: { km: 3, direction: 'east' } }, 'future')).toBe(
      'Your location is in the path of totality, right by the centre line.',
    )
  })

  it('keeps the lunar answers in the right tense', () => {
    expect(verdictMessage(lunar, { kind: 'whole' }, 'past')).toBe('The Moon was up for the whole eclipse from your location.')
    expect(verdictMessage(lunar, { kind: 'not-visible' }, 'future')).toBe('The Moon is below the horizon from your location.')
  })
})
