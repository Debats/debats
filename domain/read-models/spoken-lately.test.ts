import { describe, it, expect } from 'vitest'
import {
  bySpokenLately,
  spokenSince,
  subjectsByFigure,
  SubjectVoice,
  voicesBySubject,
} from './spoken-lately'

const figure = (id: string) => ({ kind: 'public_figure' as const, id })
const organisation = (id: string) => ({ kind: 'organisation' as const, id })
const spoke = (author: SubjectVoice['author'], subjectId: string): SubjectVoice => ({
  subjectId,
  author,
})

describe('spokenSince', () => {
  it('goes thirty days back from the instant a page renders at', () => {
    expect(spokenSince(new Date('2026-11-25T12:00:00Z'))).toEqual(new Date('2026-10-26T12:00:00Z'))
  })
})

describe('voicesBySubject', () => {
  it('counts the distinct authors who spoke on each subject', () => {
    const voices = voicesBySubject([
      spoke(figure('alma'), 's1'),
      spoke(figure('alma'), 's1'),
      spoke(figure('boris'), 's1'),
      spoke(figure('alma'), 's2'),
    ])

    expect(Array.from(voices.entries())).toEqual([
      ['s1', 2],
      ['s2', 1],
    ])
  })

  it('tells a public figure from an organisation that bears the same id', () => {
    const voices = voicesBySubject([spoke(figure('x'), 's1'), spoke(organisation('x'), 's1')])

    expect(voices.get('s1')).toBe(2)
  })
})

describe('subjectsByFigure', () => {
  it('counts the distinct subjects each public figure spoke on', () => {
    const subjects = subjectsByFigure([
      spoke(figure('alma'), 's1'),
      spoke(figure('alma'), 's1'),
      spoke(figure('alma'), 's2'),
      spoke(figure('boris'), 's1'),
    ])

    expect(Array.from(subjects.entries())).toEqual([
      ['alma', 2],
      ['boris', 1],
    ])
  })

  it('leaves the organisations out', () => {
    expect(subjectsByFigure([spoke(organisation('attac'), 's1')]).size).toBe(0)
  })
})

describe('bySpokenLately', () => {
  const subjects = [{ id: 'quiet' }, { id: 'busy' }, { id: 'stirring' }]

  it('puts first those counted the highest lately', () => {
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

  it('leaves as they were those counted alike, for the list to settle them', () => {
    expect([...subjects].sort(bySpokenLately(new Map())).map(({ id }) => id)).toEqual([
      'quiet',
      'busy',
      'stirring',
    ])
  })
})
