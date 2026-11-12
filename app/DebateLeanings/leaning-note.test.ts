import { describe, expect, it } from 'vitest'
import { Debate } from '../../domain/read-models/home-debates'
import { leaningNote } from './leaning-note'

const position = (id: string, voices: number) => ({ id, title: id, slug: id, voices })

const debate = (voices: number, positions: Debate['positions']): Debate => ({
  id: 's',
  title: 'Sujet',
  slug: 'sujet',
  problem: 'Faut-il ?',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  voices,
  statementsCount: voices,
  recentStatementsCount: 0,
  theme: null,
  positions,
})

describe('leaningNote', () => {
  it('says how many of the voices took the most supported position', () => {
    expect(leaningNote(debate(19, [position('for', 15), position('against', 4)]))).toBe(
      'La position la plus soutenue réunit 15 voix sur 19',
    )
  })

  it('says so when several positions share the lead', () => {
    expect(leaningNote(debate(17, [position('a', 6), position('b', 6), position('c', 5)]))).toBe(
      '2 positions à égalité en tête : 6 voix chacune, sur 17',
    )
  })

  it('says nothing of a subject nobody spoke on', () => {
    expect(leaningNote(debate(0, [position('a', 0)]))).toBeUndefined()
  })
})
