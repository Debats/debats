import { describe, it, expect } from 'vitest'
import {
  groupSubjectsByTheme,
  subjectIndexTotals,
  subjectsByActivity,
  subjectsToDocument,
  SubjectIndexEntry,
} from './subject-index'

const theme = (name: string) => ({
  id: `theme-${name}`,
  name,
  slug: name.toLowerCase(),
  description: `${name} : description`,
})

const entry = (
  title: string,
  statementsCount: number,
  primaryTheme: SubjectIndexEntry['primaryTheme'],
): SubjectIndexEntry => ({
  id: `subject-${title}`,
  title,
  slug: title.toLowerCase(),
  presentation: `${title} : présentation`,
  problem: `${title} ?`,
  createdAt: new Date('2026-01-01'),
  latestStatementAt: null,
  positionsCount: 2,
  statementsCount,
  publicFiguresCount: statementsCount,
  figures: [],
  primaryTheme,
})

const economie = theme('Économie')
const sante = theme('Santé')

describe('groupSubjectsByTheme', () => {
  it('puts the most documented subject of a theme first, the others after', () => {
    const [section] = groupSubjectsByTheme([
      entry('Le SMIC', 6, economie),
      entry('Les retraites', 36, economie),
      entry('Le salaire à vie', 5, economie),
    ])

    expect(section.theme).toEqual(economie)
    expect(section.featured.title).toBe('Les retraites')
    expect(section.others.map((s) => s.title)).toEqual(['Le SMIC', 'Le salaire à vie'])
    expect(section.subjectsCount).toBe(3)
  })

  it('orders sections by number of subjects, then by theme name', () => {
    const sections = groupSubjectsByTheme([
      entry('Le cannabis', 20, sante),
      entry('Le SMIC', 6, economie),
      entry('Les retraites', 36, economie),
      entry('Les pesticides', 14, sante),
      entry('La laïcité', 20, theme('Éthique')),
    ])

    expect(sections.map((s) => s.theme?.name)).toEqual(['Économie', 'Santé', 'Éthique'])
  })

  it('gathers subjects without a primary theme in a last section without theme', () => {
    const sections = groupSubjectsByTheme([
      entry('Le SMIC', 6, economie),
      entry('Orphelin', 9, null),
      entry('Autre orphelin', 1, null),
    ])

    expect(sections).toHaveLength(2)
    const last = sections[1]
    expect(last.theme).toBeNull()
    expect(last.featured.title).toBe('Orphelin')
    expect(last.others.map((s) => s.title)).toEqual(['Autre orphelin'])
  })

  it('returns nothing for no subject', () => {
    expect(groupSubjectsByTheme([])).toEqual([])
  })
})

describe('subjectsToDocument', () => {
  it('keeps the subjects with at most two statements, the least documented first', () => {
    const picked = subjectsToDocument([
      entry('Bien couvert', 12, economie),
      entry('Deux prises', 2, sante),
      entry('Une prise', 1, null),
      entry('Trois prises', 3, economie),
    ])

    expect(picked.map((s) => s.title)).toEqual(['Une prise', 'Deux prises'])
  })

  it('breaks ties by title and stops at the limit', () => {
    const picked = subjectsToDocument(
      [entry('Zèbre', 1, null), entry('Autruche', 1, null), entry('Mouton', 2, null)],
      2,
    )

    expect(picked.map((s) => s.title)).toEqual(['Autruche', 'Zèbre'])
  })
})

describe('subjectsByActivity', () => {
  it('lists every subject, the most documented first, ties by title', () => {
    const sorted = subjectsByActivity([
      entry('Le SMIC', 6, economie),
      entry('Orphelin', 36, null),
      entry('Le cannabis', 6, sante),
    ])

    expect(sorted.map((s) => s.title)).toEqual(['Orphelin', 'Le cannabis', 'Le SMIC'])
  })
})

describe('subjectIndexTotals', () => {
  it('counts subjects, themes with at least one subject, and statements', () => {
    const totals = subjectIndexTotals([
      entry('Le SMIC', 6, economie),
      entry('Les retraites', 36, economie),
      entry('Le cannabis', 20, sante),
      entry('Orphelin', 1, null),
    ])

    expect(totals).toEqual({ subjects: 4, themes: 2, statements: 63 })
  })
})
