import { describe, it, expect } from 'vitest'
import { parseMergeTarget, proposedFates, subjectMergeHref } from './subject-merge'

describe('proposedFates', () => {
  const kept = [
    { id: 'pos-1', slug: 'pour' },
    { id: 'pos-2', slug: 'contre' },
  ]

  it('folds a position into its namesake on the subject that remains, and carries the others over', () => {
    const absorbed = [
      { id: 'dup-1', slug: 'pour' },
      { id: 'dup-2', slug: 'pour-un-gel' },
    ]
    expect(proposedFates(absorbed, kept)).toEqual([
      { positionId: 'dup-1', into: 'pos-1' },
      { positionId: 'dup-2' },
    ])
  })

  it('has nothing to propose for a subject without positions', () => {
    expect(proposedFates([], kept)).toEqual([])
  })
})

describe('the address of the merge page', () => {
  it('names the subject that disappears, then the one it goes into once chosen', () => {
    expect(subjectMergeHref('le-smic')).toBe('/s/le-smic/fusionner')
    expect(subjectMergeHref('le-smic', 'le-montant-du-smic')).toBe(
      '/s/le-smic/fusionner?dans=le-montant-du-smic',
    )
  })

  it('reads the subject chosen, never the subject itself', () => {
    expect(parseMergeTarget('le-montant-du-smic', 'le-smic')).toBe('le-montant-du-smic')
    expect(parseMergeTarget('le-smic', 'le-smic')).toBeNull()
    expect(parseMergeTarget(undefined, 'le-smic')).toBeNull()
    expect(parseMergeTarget(['a', 'b'], 'le-smic')).toBeNull()
    expect(parseMergeTarget('', 'le-smic')).toBeNull()
  })
})
