import { describe, it, expect } from 'vitest'
import { createPosition, createStatement } from '../entities/entity-test-helpers'
import { declarationContent, organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { organisationRef, publicFigureRef } from '../read-models/statement-author'
import { StatementWithAuthor } from '../repositories/statement-repository'
import {
  countAllies,
  debateOnSubject,
  groupStatementsByPosition,
  groupSubjectCompany,
  voicesOf,
} from './author-on-subject'

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
    content: declarationContent('Une citation suffisamment longue.'),
    sourceName: 'Source',
    sourceUrl: 'https://example.org/source',
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

  it('keeps the allies of each position of the author, without the author herself', () => {
    const company = groupSubjectCompany(
      subjectStatements,
      organisationAuthor('attac'),
      new Set([pour.id]),
    )

    expect(company.alliesByPosition.get(pour.id)?.map((a) => a.name)).toEqual(['Simone Veil'])
    expect(countAllies(company)).toBe(1)
  })

  it('leaves out whoever took another position: the debate card shows them', () => {
    const company = groupSubjectCompany(
      subjectStatements,
      organisationAuthor('attac'),
      new Set([pour.id]),
    )

    expect(company.alliesByPosition.has(contre.id)).toBe(false)
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

describe('debateOnSubject', () => {
  const openPositions = [
    { id: pour.id, title: 'Pour', slug: 'pour' },
    { id: contre.id, title: 'Contre', slug: 'contre' },
  ]

  it('ranks the positions from the most to the least supported', () => {
    const statements = [taken(veil, pour), taken(camus, pour), taken(attac, contre)]
    const debate = debateOnSubject(openPositions, statements, new Set())
    expect(debate.map((standing) => standing.position.slug)).toEqual(['pour', 'contre'])
    expect(debate[0].authors).toHaveLength(2)
  })

  it('keeps a position nobody has defended yet', () => {
    const debate = debateOnSubject(openPositions, [taken(veil, pour)], new Set())
    expect(debate[1]).toMatchObject({ position: { slug: 'contre' }, authors: [] })
  })

  it('counts an author once however many statements she made', () => {
    const debate = debateOnSubject(openPositions, [taken(veil, pour), taken(veil, pour)], new Set())
    expect(debate[0].authors).toHaveLength(1)
  })

  it('marks the positions of the author the page is about', () => {
    const debate = debateOnSubject(openPositions, [taken(veil, pour)], new Set([pour.id]))
    expect(debate.map((standing) => standing.hers)).toEqual([true, false])
  })
})

describe('voicesOf', () => {
  it('reduces a statement to who spoke and for which position', () => {
    expect(voicesOf([taken(veil, pour)])).toEqual([
      { authorKey: 'public_figure-veil', positionId: pour.id },
    ])
  })
})
