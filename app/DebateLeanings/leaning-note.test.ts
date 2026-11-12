import { describe, expect, it } from 'vitest'
import { leaningNote } from './leaning-note'

const position = { id: 'p', title: 'Position', slug: 'position', voices: 6 }

describe('leaningNote', () => {
  it('says how many of the voices took the most supported position', () => {
    expect(
      leaningNote({ position: { ...position, voices: 15 }, share: 15 / 19, tied: 1 }, 19),
    ).toBe('La position la plus soutenue réunit 15 voix sur 19')
  })

  it('says so when several positions share the lead', () => {
    expect(leaningNote({ position, share: 6 / 17, tied: 2 }, 17)).toBe(
      '2 positions à égalité en tête : 6 voix chacune, sur 17',
    )
  })
})
