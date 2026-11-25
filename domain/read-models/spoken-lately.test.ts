import { describe, it, expect } from 'vitest'
import { bySpokenLately, spokenSince, voicesBySubject } from './spoken-lately'

describe('spokenSince', () => {
  it('goes thirty days back from the instant a page renders at', () => {
    expect(spokenSince(new Date('2026-11-25T12:00:00Z'))).toEqual(new Date('2026-10-26T12:00:00Z'))
  })
})

describe('voicesBySubject', () => {
  it('counts the distinct authors who spoke on each subject', () => {
    const voices = voicesBySubject([
      { subjectId: 's1', authorKey: 'alma' },
      { subjectId: 's1', authorKey: 'alma' },
      { subjectId: 's1', authorKey: 'boris' },
      { subjectId: 's2', authorKey: 'alma' },
    ])

    expect(Array.from(voices.entries())).toEqual([
      ['s1', 2],
      ['s2', 1],
    ])
  })
})

describe('bySpokenLately', () => {
  const subjects = [{ id: 'quiet' }, { id: 'busy' }, { id: 'stirring' }]

  it('puts first the subjects the most voices spoke on lately', () => {
    const lately = new Map([
      ['busy', 40],
      ['stirring', 3],
    ])

    expect([...subjects].sort(bySpokenLately(lately)).map(({ id }) => id)).toEqual([
      'busy',
      'stirring',
      'quiet',
    ])
  })

  it('leaves as they were the subjects as spoken on lately, for the list to settle them', () => {
    expect([...subjects].sort(bySpokenLately(new Map())).map(({ id }) => id)).toEqual([
      'quiet',
      'busy',
      'stirring',
    ])
  })
})
