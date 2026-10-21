import { Occupation } from '../entities/occupation'
import { OccupationAssignment } from '../services/occupation-distribution'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'

/** The figures holding one occupation, for the page of a family */
export interface OccupationSection {
  id: string
  name: string
  figures: PublicFigureActivitySummary[]
}

/**
 * Groups the figures of a family under each occupation they hold, in the
 * order of the occupations; an occupation nobody holds has no section. A
 * figure holding two occupations of the family appears under both.
 */
export function occupationSections(
  occupations: readonly Occupation[],
  assignments: readonly OccupationAssignment[],
  figures: readonly PublicFigureActivitySummary[],
): OccupationSection[] {
  const figureById = new Map(figures.map((figure) => [figure.id, figure]))
  return occupations.flatMap((occupation) => {
    const holders = assignments
      .filter((a) => a.occupationId === occupation.id)
      .flatMap((a) => figureById.get(a.publicFigureId) ?? [])
    return holders.length > 0
      ? [{ id: occupation.id, name: occupation.name, figures: holders }]
      : []
  })
}

/** How many distinct figures the sections hold */
export const distinctFiguresCount = (sections: readonly OccupationSection[]): number =>
  new Set(sections.flatMap((s) => s.figures.map((f) => f.id))).size
