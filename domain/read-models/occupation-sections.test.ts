import { describe, it, expect } from 'vitest'
import { createOccupation } from '../entities/occupation'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'
import { distinctFiguresCount, occupationSections } from './occupation-sections'

const figure = (id: string, name: string): PublicFigureActivitySummary => ({
  id,
  name,
  slug: id,
  presentation: '',
  statementsCount: 0,
  subjectsCount: 0,
  latestStatementAt: null,
})

const economist = createOccupation({ name: 'Économiste', familyId: 'f', createdBy: 'a' })
const sociologist = createOccupation({ name: 'Sociologue', familyId: 'f', createdBy: 'a' })
const historian = createOccupation({ name: 'Historien·ne', familyId: 'f', createdBy: 'a' })
const figures = [figure('piketty', 'Thomas Piketty'), figure('beaud', 'Stéphane Beaud')]

describe('occupationSections', () => {
  it('groups the figures under each occupation, in the order of the occupations', () => {
    const sections = occupationSections(
      [economist, sociologist, historian],
      [
        { publicFigureId: 'beaud', occupationId: sociologist.id },
        { publicFigureId: 'piketty', occupationId: economist.id },
        { publicFigureId: 'piketty', occupationId: sociologist.id },
      ],
      figures,
    )

    expect(sections.map((s) => [s.name, s.figures.map((f) => f.name)])).toEqual([
      ['Économiste', ['Thomas Piketty']],
      ['Sociologue', ['Stéphane Beaud', 'Thomas Piketty']],
    ])
  })

  it('ignores an assignment whose figure is not among the summaries', () => {
    const sections = occupationSections(
      [economist],
      [{ publicFigureId: 'ghost', occupationId: economist.id }],
      figures,
    )

    expect(sections).toEqual([])
  })

  it('counts a figure once whatever its occupations', () => {
    const sections = occupationSections(
      [economist, sociologist],
      [
        { publicFigureId: 'piketty', occupationId: economist.id },
        { publicFigureId: 'piketty', occupationId: sociologist.id },
        { publicFigureId: 'beaud', occupationId: sociologist.id },
      ],
      figures,
    )

    expect(distinctFiguresCount(sections)).toBe(2)
  })
})
