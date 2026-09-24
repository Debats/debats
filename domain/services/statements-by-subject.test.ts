import { describe, it, expect } from 'vitest'
import { createPosition } from '../entities/position'
import { createStatement, publicFigureAuthor } from '../entities/statement'
import { createSubject } from '../entities/subject'
import { StatementWithDetails } from '../repositories/statement-repository'
import { groupStatementsBySubject } from './statements-by-subject'

function entry(subjectTitle: string, createdAt: Date): StatementWithDetails {
  const subject = createSubject({
    title: subjectTitle,
    presentation: 'Présentation suffisamment longue.',
    problem: 'Une problématique ?',
    createdBy: 'user',
  })
  const position = createPosition({
    title: 'Pour',
    description: 'Description suffisamment longue.',
    subjectId: subject.id,
    createdBy: 'user',
  })
  const statement = createStatement({
    author: publicFigureAuthor('figure'),
    positionId: position.id,
    statementType: 'declaration',
    sourceName: 'Source',
    quote: 'Une citation suffisamment longue.',
    statedAt: createdAt,
    createdBy: 'user',
  })
  return { statement: { ...statement, createdAt }, position, subject }
}

describe('groupStatementsBySubject', () => {
  it('returns no group without statements', () => {
    expect(groupStatementsBySubject([])).toEqual([])
  })

  it('groups the statements of one subject together', () => {
    const first = entry('Le nucléaire', new Date('2024-01-01'))
    const second: StatementWithDetails = {
      ...entry('Le nucléaire', new Date('2024-02-01')),
      subject: first.subject,
    }

    const groups = groupStatementsBySubject([first, second])

    expect(groups).toHaveLength(1)
    expect(groups[0].entries).toHaveLength(2)
  })

  it('puts the most recently documented subject first', () => {
    const older = entry('Le nucléaire', new Date('2024-01-01'))
    const newer = entry('Le SMIC', new Date('2024-06-01'))

    const groups = groupStatementsBySubject([older, newer])

    expect(groups.map((g) => g.subject.title)).toEqual(['Le SMIC', 'Le nucléaire'])
  })
})
