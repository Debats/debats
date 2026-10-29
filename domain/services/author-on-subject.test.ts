import { describe, it, expect } from 'vitest'
import { createPosition, createStatement } from '../entities/entity-test-helpers'
import { organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { organisationRef, publicFigureRef } from '../read-models/statement-author'
import { StatementWithAuthor } from '../repositories/statement-repository'
import { countAllies, groupStatementsByPosition, groupSubjectCompany } from './author-on-subject'

const pour = createPosition({
  title: 'Pour',
  description: 'Description suffisamment longue.',
  subjectId: 'subject',
  createdBy: 'user',
})
const contre = createPosition({
  title: 'Contre',
  description: 'Description suffisamment longue.',
  subjectId: 'subject',
  createdBy: 'user',
})

const attac = organisationRef({ id: 'attac', name: 'Attac', slug: 'attac', acronym: null })
const veil = publicFigureRef({ id: 'veil', name: 'Simone Veil', slug: 'simone-veil' })
const camus = publicFigureRef({ id: 'camus', name: 'Albert Camus', slug: 'albert-camus' })

function taken(author: typeof attac, position: typeof pour): StatementWithAuthor {
  const statement = createStatement({
    author:
      author.kind === 'organisation'
        ? organisationAuthor(author.id)
        : publicFigureAuthor(author.id),
    positionId: position.id,
    statementType: 'declaration',
    sourceName: 'Source',
    quote: 'Une citation suffisamment longue.',
    statedAt: new Date('2024-01-01'),
    createdBy: 'user',
  })
  return { statement, position, author, arguments: [] }
}

describe('groupStatementsByPosition', () => {
  it('keeps one group per position with its statements', () => {
    const a = taken(attac, pour)
    const b = taken(attac, pour)
    const c = taken(attac, contre)
    const groups = groupStatementsByPosition(
      [a, b, c].map((s) => ({ ...s, subject: { id: 'subject' } as never })),
    )

    expect(groups.map((g) => g.position.title)).toEqual(['Pour', 'Contre'])
    expect(groups[0].statements).toHaveLength(2)
  })
})

describe('groupSubjectCompany', () => {
  const subjectStatements = [
    taken(attac, pour),
    taken(veil, pour),
    taken(veil, pour),
    taken(camus, contre),
  ]

  it('separates allies on the author positions from the other positions, without the author', () => {
    const company = groupSubjectCompany(
      subjectStatements,
      organisationAuthor('attac'),
      new Set([pour.id]),
    )

    expect(company.alliesByPosition.get(pour.id)?.map((a) => a.name)).toEqual(['Simone Veil'])
    expect(company.opponents).toEqual([{ title: 'Contre', slug: contre.slug, authors: [camus] }])
    expect(countAllies(company)).toBe(1)
  })

  it('does not confuse a public figure and an organisation sharing an identifier', () => {
    const company = groupSubjectCompany(
      [taken(attac, pour), taken(publicFigureRef({ ...attac }), pour)],
      organisationAuthor('attac'),
      new Set([pour.id]),
    )

    expect(company.alliesByPosition.get(pour.id)).toHaveLength(1)
  })
})
