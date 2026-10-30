import { describe, it, expect } from 'vitest'
import { createPosition, createStatement } from '../entities/entity-test-helpers'
import { declarationContent, publicFigureAuthor } from '../entities/statement'
import { StatementWithAuthor } from '../repositories/statement-repository'
import { publicFigureRef } from '../read-models/statement-author'
import { statedSpanLabel, subjectTimeline } from './subject-timeline'

const position = (title: string) =>
  createPosition({
    title,
    description: 'Une description suffisamment longue.',
    subjectId: 'subject-1',
    createdBy: 'founder',
  })
const pour = position('Pour')
const contre = position('Contre')

const entry = (
  statedAt: string,
  pos = pour,
  authorName = 'Jean Dupont',
  createdAt = '2024-06-01',
): StatementWithAuthor => ({
  statement: {
    ...createStatement({
      author: publicFigureAuthor(`figure-${authorName}`),
      positionId: pos.id,
      content: declarationContent(`Citation du ${statedAt}, suffisamment longue.`),
      sourceName: 'Le Monde',
      sourceUrl: 'https://lemonde.fr/article',
      statedAt: new Date(statedAt),
      createdBy: 'founder',
    }),
    createdAt: new Date(createdAt),
    updatedAt: new Date(createdAt),
  },
  position: pos,
  author: publicFigureRef({ id: `figure-${authorName}`, name: authorName, slug: 'jean-dupont' }),
  arguments: [],
})

describe('subjectTimeline', () => {
  it('is empty without statements', () => {
    expect(subjectTimeline([])).toEqual([])
  })

  it('groups the statements by year, newest first, and orders each year newest first', () => {
    const timeline = subjectTimeline([
      entry('2022-03-10'),
      entry('2024-01-15', contre),
      entry('2024-09-01', pour, 'Marie Martin'),
      entry('2022-11-20', contre),
    ])

    expect(timeline.map((year) => year.year)).toEqual([2024, 2022])
    expect(timeline[0].entries.map((e) => e.statedAt.toISOString().slice(0, 10))).toEqual([
      '2024-09-01',
      '2024-01-15',
    ])
    expect(timeline[1].entries.map((e) => e.statedAt.toISOString().slice(0, 10))).toEqual([
      '2022-11-20',
      '2022-03-10',
    ])
  })

  it('carries what an entry shows: author, position, what it says, source', () => {
    const [year] = subjectTimeline([entry('2024-01-15', contre)])

    expect(year.entries[0]).toMatchObject({
      author: { kind: 'public_figure', name: 'Jean Dupont', slug: 'jean-dupont' },
      position: { id: contre.id, title: 'Contre', slug: contre.slug },
      content: {
        kind: 'declaration',
        quote: 'Citation du 2024-01-15, suffisamment longue.',
      },
      sourceName: 'Le Monde',
      sourceUrl: 'https://lemonde.fr/article',
    })
  })

  it('breaks a tie on the same day by the moment the statement was recorded, latest first', () => {
    const [year] = subjectTimeline([
      entry('2024-01-15', pour, 'Jean Dupont', '2024-06-01'),
      entry('2024-01-15', contre, 'Marie Martin', '2024-06-02'),
    ])

    expect(year.entries.map((e) => e.author.name)).toEqual(['Marie Martin', 'Jean Dupont'])
  })

  it('counts, per year, how many authors spoke and on how many positions', () => {
    const [year] = subjectTimeline([
      entry('2024-01-15', pour, 'Jean Dupont'),
      entry('2024-03-15', pour, 'Jean Dupont'),
      entry('2024-09-01', contre, 'Marie Martin'),
    ])

    expect(year).toMatchObject({ year: 2024, authorsCount: 2, positionsCount: 2 })
  })
})

describe('statedSpanLabel', () => {
  it('shows the first and last years an opinion was stated', () => {
    expect(statedSpanLabel({ from: new Date('2015-03-01'), to: new Date('2023-11-14') })).toBe(
      '2015 → 2023',
    )
  })

  it('shows one year when everything was stated the same year', () => {
    expect(statedSpanLabel({ from: new Date('2023-01-01'), to: new Date('2023-11-14') })).toBe(
      '2023',
    )
  })

  it('shows nothing without any statement', () => {
    expect(statedSpanLabel(null)).toBeUndefined()
  })
})
