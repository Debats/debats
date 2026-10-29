import { describe, it, expect } from 'vitest'
import { createStatement } from './entity-test-helpers'
import { organisationAuthor, publicFigureAuthor } from './statement'

const base = {
  positionId: 'pos-1',
  statementType: 'declaration' as const,
  sourceName: 'Le Monde',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: new Date('2024-01-15'),
  createdBy: 'user-1',
}

describe('StatementAuthor', () => {
  it('names a public figure', () => {
    expect(publicFigureAuthor('figure-1')).toEqual({ kind: 'public_figure', id: 'figure-1' })
  })

  it('names an organisation', () => {
    expect(organisationAuthor('org-1')).toEqual({ kind: 'organisation', id: 'org-1' })
  })

  it('is refused by the statement schema for an unknown kind', () => {
    expect(() =>
      createStatement({ ...base, author: { kind: 'robot', id: 'x' } as never }),
    ).toThrow()
  })
})
