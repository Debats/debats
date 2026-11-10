import { describe, expect, it } from 'vitest'
import { makeDraft } from '../use-cases/draft-test-helpers'
import { tallyDrafts, tallyLine } from './chantier-summary'

describe('tallyDrafts', () => {
  it('counts what became of each draft', () => {
    const tally = tallyDrafts([
      makeDraft({ status: 'pending' }),
      makeDraft({ status: 'pending' }),
      makeDraft({ status: 'validated' }),
      makeDraft({ status: 'rejected' }),
      makeDraft({ status: 'revision_requested' }),
    ])
    expect(tally).toEqual({ total: 5, pending: 2, validated: 1, setAside: 2 })
  })
})

describe('tallyLine', () => {
  it('says there is nothing yet', () => {
    expect(tallyLine({ total: 0, pending: 0, validated: 0, setAside: 0 })).toBe(
      'Aucun brouillon pour l’instant',
    )
  })

  it('names only the counts that are not zero, in the order of the card', () => {
    expect(tallyLine({ total: 14, pending: 6, validated: 5, setAside: 3 })).toBe(
      '14 brouillons · 5 validés · 6 à relire · 3 écartés',
    )
    expect(tallyLine({ total: 1, pending: 1, validated: 0, setAside: 0 })).toBe(
      '1 brouillon · 1 à relire',
    )
  })
})
