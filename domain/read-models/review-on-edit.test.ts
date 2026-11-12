import { describe, it, expect } from 'vitest'
import { ReviewDetail } from './review'
import { correctionOf, NO_CHOICE, reviewToSpeakOf } from './review-on-edit'

const unreviewed: ReviewDetail = {
  confirmations: 0,
  confirmers: [],
  lastConfirmedAt: null,
  flags: [],
  addedByViewer: false,
}
const confirmed: ReviewDetail = { ...unreviewed, confirmations: 2 }
const flagged: ReviewDetail = {
  ...unreviewed,
  flags: [{ id: 'flag-1', reason: 'other', comment: 'Lien mort.', by: null, at: new Date() }],
}

describe('reviewToSpeakOf', () => {
  it('is nothing for an entity nobody confirmed or flagged', () => {
    expect(reviewToSpeakOf(unreviewed)).toBeNull()
  })

  it('is the review itself as soon as a reader confirmed or a flag is open', () => {
    expect(reviewToSpeakOf(confirmed)).toBe(confirmed)
    expect(reviewToSpeakOf(flagged)).toBe(flagged)
  })
})

describe('correctionOf', () => {
  it('sends nothing with the edit of an entity that has no review to speak of', () => {
    expect(correctionOf(null, { ...NO_CHOICE, settlesFlags: true })).toBeUndefined()
  })

  it('sends what the editor said', () => {
    expect(
      correctionOf(flagged, { settlesFlags: true, answer: 'Corrigé.', resetConfirmations: true }),
    ).toEqual({ settlesFlags: true, answer: 'Corrigé.', resetConfirmations: true })
  })

  it('keeps the confirmations the editor said nothing of', () => {
    expect(correctionOf(confirmed, NO_CHOICE)).toEqual({
      settlesFlags: false,
      answer: '',
      resetConfirmations: false,
    })
  })
})
