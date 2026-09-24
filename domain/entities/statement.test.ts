import { describe, it, expect } from 'vitest'
import { createStatement, organisationAuthor, publicFigureAuthor } from './statement'

const base = {
  positionId: 'pos-1',
  statementType: 'declaration' as const,
  sourceName: 'Le Monde',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: new Date('2024-01-15'),
  createdBy: 'user-1',
}

describe('Statement entity', () => {
  it('is authored by a public figure', () => {
    const statement = createStatement({ ...base, author: publicFigureAuthor('figure-1') })

    expect(statement.author).toEqual({ kind: 'public_figure', id: 'figure-1' })
  })

  it('is authored by an organisation', () => {
    const statement = createStatement({ ...base, author: organisationAuthor('org-1') })

    expect(statement.author).toEqual({ kind: 'organisation', id: 'org-1' })
  })

  it('rejects an author of unknown kind', () => {
    expect(() =>
      createStatement({ ...base, author: { kind: 'robot', id: 'x' } as never }),
    ).toThrow()
  })
})
