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
  /** Distinct figures of the position, whatever their families */
  figuresCount: number
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
      figuresCount: figures.size,
      ...tally(figures, figureFamilies, families),
    })),
  }
}

/** Below this many figures, a family's shares say little */
export const SMALL_FAMILY = 3

/** Positions kept apart in the comparisons; the rest fold into one */
export const MATRIX_POSITIONS = 5

export interface MatrixPosition {
  id: string
  title: string
  /** Figures of the position, whatever their family */
  count: number
  /** Among every (figure, position) pair of the subject */
  share: number
}

export interface MatrixCell {
  count: number
  /** Among the family's (figure, position) pairs */
  share: number
  /** share minus the position's overall share, in [-1, 1] */
  deviation: number
}

export interface MatrixFamily {
  family: OccupationFamily
  /** The family's (figure, position) pairs: a figure on two positions counts twice */
  total: number
  cells: MatrixCell[]
  small: boolean
}

export interface FamilyPositionMatrix {
  positions: MatrixPosition[]
  families: MatrixFamily[]
  overall: { total: number; cells: MatrixCell[] }
}

const OTHERS_ID = 'others'

/**
 * Families against positions, for the comparisons: how each family splits
 * across the positions, against how everyone splits. Positions come most
 * supported first, and those beyond the limit fold into « Autres positions ».
 */
export function familyPositionMatrix(
  distribution: FamilyDistribution,
  maxPositions = MATRIX_POSITIONS,
): FamilyPositionMatrix {
  const countOf = (p: PositionFamilyDistribution) => p.figuresCount
  const ranked = [...distribution.byPosition].sort((a, b) => countOf(b) - countOf(a))
  const kept = ranked.slice(0, maxPositions)
  const folded = ranked.slice(maxPositions)

  const columns = [
    ...kept.map((p) => ({ id: p.position.id, title: p.position.title, members: [p] })),
    ...(folded.length > 0 ? [{ id: OTHERS_ID, title: 'Autres positions', members: folded }] : []),
  ]
  const familyCountIn = (members: PositionFamilyDistribution[], familyId: string) =>
    members.reduce(
      (sum, p) => sum + (p.families.find((f) => f.family.id === familyId)?.count ?? 0),
      0,
    )

  const overallCounts = columns.map((c) => c.members.reduce((sum, p) => sum + countOf(p), 0))
  const overallTotal = overallCounts.reduce((a, b) => a + b, 0)
  const overallShares = overallCounts.map((count) => (overallTotal ? count / overallTotal : 0))

  const families = distribution.overall.map(({ family, count: figuresCount }) => {
    const counts = columns.map((c) => familyCountIn(c.members, family.id))
    const total = counts.reduce((a, b) => a + b, 0)
    return {
      family,
      total,
      small: figuresCount < SMALL_FAMILY,
      cells: counts.map((count, i) => {
        const share = total ? count / total : 0
        return { count, share, deviation: share - overallShares[i] }
      }),
    }
  })

  return {
    positions: columns.map((c, i) => ({
      id: c.id,
      title: c.title,
      count: overallCounts[i],
      share: overallShares[i],
    })),
    families,
    overall: {
      total: overallTotal,
      cells: overallCounts.map((count, i) => ({ count, share: overallShares[i], deviation: 0 })),
    },
  }
}
