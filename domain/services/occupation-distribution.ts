import { Occupation } from '../entities/occupation'
import { OccupationFamily } from '../entities/occupation-family'

/** A public figure holds an occupation */
export interface OccupationAssignment {
  publicFigureId: string
  occupationId: string
}

export interface FamilyCount {
  family: OccupationFamily
  /** Distinct public figures */
  count: number
}

export interface PositionFamilyDistribution {
  position: { id: string; title: string }
  families: FamilyCount[]
  /** Figures of the position without any occupation yet */
  unassignedCount: number
}

export interface FamilyDistribution {
  overall: FamilyCount[]
  unassignedCount: number
  /** In the order the positions first appear */
  byPosition: PositionFamilyDistribution[]
}

/** How many public figures hold each occupation */
export function countFiguresByOccupation(assignments: OccupationAssignment[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const { occupationId } of assignments) {
    counts.set(occupationId, (counts.get(occupationId) ?? 0) + 1)
  }
  return counts
}

/** The families each public figure belongs to, through its occupations */
function familiesByFigure(
  assignments: OccupationAssignment[],
  occupations: Occupation[],
): Map<string, Set<string>> {
  const familyOfOccupation = new Map<string, string>(occupations.map((o) => [o.id, o.familyId]))
  const result = new Map<string, Set<string>>()
  for (const { publicFigureId, occupationId } of assignments) {
    const familyId = familyOfOccupation.get(occupationId)
    if (!familyId) continue
    const set = result.get(publicFigureId) ?? new Set<string>()
    set.add(familyId)
    result.set(publicFigureId, set)
  }
  return result
}

/** How many distinct public figures each family gathers */
export function countFiguresByFamily(
  assignments: OccupationAssignment[],
  occupations: Occupation[],
): Map<string, number> {
  const counts = new Map<string, number>()
  familiesByFigure(assignments, occupations).forEach((familyIds) => {
    familyIds.forEach((familyId) => counts.set(familyId, (counts.get(familyId) ?? 0) + 1))
  })
  return counts
}

const byCountThenName = (a: FamilyCount, b: FamilyCount) =>
  b.count - a.count || a.family.name.localeCompare(b.family.name, 'fr')

/** Counts the families of a set of figures; those without occupation are counted apart */
function tally(
  figureIds: Set<string>,
  figureFamilies: Map<string, Set<string>>,
  families: OccupationFamily[],
): { families: FamilyCount[]; unassignedCount: number } {
  const counts = new Map<string, number>()
  let unassignedCount = 0
  figureIds.forEach((figureId) => {
    const familyIds = figureFamilies.get(figureId)
    if (!familyIds || familyIds.size === 0) {
      unassignedCount += 1
      return
    }
    familyIds.forEach((familyId) => counts.set(familyId, (counts.get(familyId) ?? 0) + 1))
  })
  return {
    families: families
      .flatMap((family) => {
        const count = counts.get(family.id)
        return count ? [{ family, count }] : []
      })
      .sort(byCountThenName),
    unassignedCount,
  }
}

/**
 * Who speaks on a subject, by family of occupation: overall and position by
 * position. A figure is counted once per family, even with several statements.
 * Only public figures are expected here; organisations have no occupation.
 */
export function familyDistribution(
  entries: Array<{ position: { id: string; title: string }; authorId: string }>,
  assignments: OccupationAssignment[],
  occupations: Occupation[],
  families: OccupationFamily[],
): FamilyDistribution {
  const figureFamilies = familiesByFigure(assignments, occupations)

  const allFigures = new Set<string>()
  const positions = new Map<
    string,
    { position: { id: string; title: string }; figures: Set<string> }
  >()
  for (const { position, authorId } of entries) {
    allFigures.add(authorId)
    const group = positions.get(position.id) ?? { position, figures: new Set<string>() }
    group.figures.add(authorId)
    positions.set(position.id, group)
  }

  const overall = tally(allFigures, figureFamilies, families)
  return {
    overall: overall.families,
    unassignedCount: overall.unassignedCount,
    byPosition: Array.from(positions.values()).map(({ position, figures }) => ({
      position,
      ...tally(figures, figureFamilies, families),
    })),
  }
}
