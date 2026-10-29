import { describe, it, expect } from 'vitest'
import {
  countFiguresByFamily,
  countFiguresByOccupation,
  familyDistribution,
  familyPositionMatrix,
  OccupationAssignment,
} from './occupation-distribution'
import { createOccupation, createOccupationFamily } from '../entities/entity-test-helpers'

const executive = createOccupationFamily({ name: 'Exécutif', position: 1, createdBy: 'f' })
const elected = createOccupationFamily({ name: 'Élu·e national·e', position: 2, createdBy: 'f' })
const union = createOccupationFamily({ name: 'Syndicaliste', position: 5, createdBy: 'f' })
const families = [executive, elected, union]

const minister = createOccupation({ name: 'Ministre', familyId: executive.id, createdBy: 'f' })
const president = createOccupation({ name: 'Président·e', familyId: executive.id, createdBy: 'f' })
const deputy = createOccupation({ name: 'Député·e', familyId: elected.id, createdBy: 'f' })
const occupations = [minister, president, deputy]

const assignments: OccupationAssignment[] = [
  { publicFigureId: 'macron', occupationId: president.id },
  { publicFigureId: 'macron', occupationId: minister.id },
  { publicFigureId: 'lepen', occupationId: deputy.id },
  { publicFigureId: 'attal', occupationId: minister.id },
  { publicFigureId: 'attal', occupationId: deputy.id },
]

describe('countFiguresByOccupation', () => {
  it('counts the figures holding each occupation', () => {
    const counts = countFiguresByOccupation(assignments)

    expect(counts.get(minister.id)).toBe(2)
    expect(counts.get(deputy.id)).toBe(2)
    expect(counts.get(president.id)).toBe(1)
  })
})

describe('countFiguresByFamily', () => {
  it('counts each figure once per family, whatever the number of its occupations there', () => {
    const counts = countFiguresByFamily(assignments, occupations)

    expect(counts.get(executive.id)).toBe(2)
    expect(counts.get(elected.id)).toBe(2)
    expect(counts.has(union.id)).toBe(false)
  })
})

describe('familyDistribution', () => {
  const position = (id: string, title: string) => ({ id, title })
  const entries = [
    { position: position('p1', 'Pour'), authorId: 'macron' },
    { position: position('p1', 'Pour'), authorId: 'attal' },
    { position: position('p2', 'Contre'), authorId: 'lepen' },
    { position: position('p2', 'Contre'), authorId: 'inconnu' },
    { position: position('p1', 'Pour'), authorId: 'macron' },
  ]

  it('counts distinct figures per family, overall and per position, the biggest family first', () => {
    const distribution = familyDistribution(entries, assignments, occupations, families)

    expect(distribution.overall.map((f) => [f.family.name, f.count])).toEqual([
      ['Élu·e national·e', 2],
      ['Exécutif', 2],
    ])
    expect(distribution.unassignedCount).toBe(1)
    expect(distribution.byPosition.map((p) => p.position.title)).toEqual(['Pour', 'Contre'])
    expect(distribution.byPosition[0].families.map((f) => [f.family.name, f.count])).toEqual([
      ['Exécutif', 2],
      ['Élu·e national·e', 1],
    ])
    expect(distribution.byPosition[1].families.map((f) => [f.family.name, f.count])).toEqual([
      ['Élu·e national·e', 1],
    ])
    expect(distribution.byPosition[1].unassignedCount).toBe(1)
  })

  it('is empty without statements', () => {
    const distribution = familyDistribution([], assignments, occupations, families)

    expect(distribution.overall).toEqual([])
    expect(distribution.byPosition).toEqual([])
    expect(distribution.unassignedCount).toBe(0)
  })
})

describe('familyPositionMatrix', () => {
  const position = (id: string, title: string) => ({ id, title })
  const entries = [
    { position: position('p1', 'Pour'), authorId: 'macron' },
    { position: position('p1', 'Pour'), authorId: 'attal' },
    { position: position('p2', 'Contre'), authorId: 'lepen' },
    { position: position('p2', 'Contre'), authorId: 'attal' },
    { position: position('p3', 'Nuancé'), authorId: 'lepen' },
  ]
  const distribution = familyDistribution(entries, assignments, occupations, families)

  it('orders positions by support and gives each family its shares across them', () => {
    const matrix = familyPositionMatrix(distribution)

    expect(matrix.positions.map((p) => [p.title, p.count])).toEqual([
      ['Pour', 2],
      ['Contre', 2],
      ['Nuancé', 1],
    ])
    const executive = matrix.families.find((f) => f.family.name === 'Exécutif')
    // macron and attal on Pour, attal on Contre: 2 + 1 cells
    expect(executive?.total).toBe(3)
    expect(executive?.cells.map((c) => c.count)).toEqual([2, 1, 0])
    expect(executive?.cells.map((c) => Math.round(c.share * 100))).toEqual([67, 33, 0])
    expect(executive?.small).toBe(true)
  })

  it('compares each family share to the overall share of the position', () => {
    const matrix = familyPositionMatrix(distribution)
    // overall: Pour 2 of 5 = 40 %; Exécutif on Pour: 67 % → +27 points
    expect(matrix.overall.cells.map((c) => Math.round(c.share * 100))).toEqual([40, 40, 20])
    const executive = matrix.families.find((f) => f.family.name === 'Exécutif')
    expect(Math.round((executive?.cells[0].deviation ?? 0) * 100)).toBe(27)
  })

  it('folds the positions beyond the limit into « Autres positions »', () => {
    const matrix = familyPositionMatrix(distribution, 2)

    expect(matrix.positions.map((p) => p.title)).toEqual(['Pour', 'Contre', 'Autres positions'])
    expect(matrix.overall.cells.map((c) => c.count)).toEqual([2, 2, 1])
  })
})
