import { describe, expect, it } from 'vitest'
import type { Visibility } from '../globe/visibility'
import { locationMessage } from './YourLocation'

const ANSWERS: Record<'solar' | 'lunar', Visibility[]> = {
  solar: ['central', 'none'],
  lunar: ['full', 'partial', 'none'],
}

describe('locationMessage', () => {
  it('has a future, present and past message for every answer', () => {
    for (const type of ['solar', 'lunar'] as const) {
      for (const visibility of ANSWERS[type]) {
        const future = locationMessage(type, visibility, 'future')
        const present = locationMessage(type, visibility, 'present')
        const past = locationMessage(type, visibility, 'past')
        expect(future, `${type}/${visibility}`).toBeTruthy()
        expect(present, `${type}/${visibility}`).toBeTruthy()
        expect(past, `${type}/${visibility}`).not.toBe(future)
      }
    }
  })

  it('writes past answers in the past tense', () => {
    expect(locationMessage('solar', 'central', 'past')).toBe('Your location was in the path of totality or annularity.')
    expect(locationMessage('lunar', 'full', 'past')).toBe('The Moon was up for the whole eclipse from your location.')
    expect(locationMessage('lunar', 'none', 'past')).toBe('The Moon was below the horizon from your location.')
  })

  it('says nothing for zones the type does not have', () => {
    expect(locationMessage('solar', 'full', 'future')).toBeNull()
    expect(locationMessage('lunar', 'central', 'past')).toBeNull()
  })
})
