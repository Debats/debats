import { describe, it, expect } from 'vitest'
import { createPosition } from '../entities/position'
import { createStatement, publicFigureAuthor } from '../entities/statement'
import { createSubject } from '../entities/subject'
import { publicFigureRef, StatementAuthorRef } from '../read-models/statement-author'
import { StatementWithAuthorAndSubject } from '../repositories/statement-repository'
import { countArgumentAuthors, groupArgumentUsage } from './argument-usage'

const subject = (title: string) =>
  createSubject({
    title,
    presentation: 'Présentation suffisamment longue.',
    problem: 'Une problématique ?',
    createdBy: 'user',
  })
const position = (title: string, subjectId: string) =>
  createPosition({
    title,
    description: 'Description suffisamment longue.',
    subjectId,
    createdBy: 'user',
  })

const euthanasie = subject('L’euthanasie')
const ivg = subject('L’IVG')
const pour = position('Pour', euthanasie.id)
const contre = position('Contre', euthanasie.id)
const constitution = position('Inscription dans la Constitution', ivg.id)
const veil = publicFigureRef({ id: 'veil', name: 'Simone Veil', slug: 'simone-veil' })
const camus = publicFigureRef({ id: 'camus', name: 'Albert Camus', slug: 'albert-camus' })

function taken(
  author: StatementAuthorRef,
  pos: typeof pour,
  subj: typeof euthanasie,
): StatementWithAuthorAndSubject {
  const statement = createStatement({
    author: publicFigureAuthor(author.id),
    positionId: pos.id,
    statementType: 'declaration',
    sourceName: 'Source',
    quote: 'Une citation suffisamment longue.',
    statedAt: new Date('2024-01-01'),
    createdBy: 'user',
  })
  return { statement, position: pos, subject: subj, author, arguments: [] }
}

describe('groupArgumentUsage', () => {
  it('groups by subject then position, the most mobilised first', () => {
    const usage = groupArgumentUsage([
      taken(veil, constitution, ivg),
      taken(veil, pour, euthanasie),
      taken(camus, pour, euthanasie),
      taken(camus, contre, euthanasie),
    ])

    expect(usage.map((u) => u.subject.title)).toEqual(['L’euthanasie', 'L’IVG'])
    expect(usage[0].statementsCount).toBe(3)
    expect(usage[0].positions.map((p) => [p.position.title, p.entries.length])).toEqual([
      ['Pour', 2],
      ['Contre', 1],
    ])
  })

  it('counts each author once across subjects', () => {
    expect(
      countArgumentAuthors([taken(veil, constitution, ivg), taken(veil, pour, euthanasie)]),
    ).toBe(1)
  })
})
