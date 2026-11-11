import { Occupation, sameOccupationName } from '../entities/occupation'
import { OccupationFamily } from '../entities/occupation-family'

/** A family with its occupations, as the lists and selectors show them */
export interface OccupationFamilyGroup {
  family: OccupationFamily
  occupations: Occupation[]
}

/** Families in display order, each with its occupations by name; empty families included */
export function groupOccupationsByFamily(
  families: OccupationFamily[],
  occupations: Occupation[],
): OccupationFamilyGroup[] {
  return [...families]
    .sort((a, b) => a.position - b.position || a.name.localeCompare(b.name, 'fr'))
    .map((family) => ({
      family,
      occupations: occupations
        .filter((o) => o.familyId === family.id)
        .sort((a, b) => a.name.localeCompare(b.name, 'fr')),
    }))
}

/** An occupation a public figure holds, still or formerly */
export interface OccupationHeld {
  occupation: Occupation
  current: boolean
}

/** What a contributor sets for one occupation of a figure */
export interface OccupationAssignmentInput {
  occupationId: string
  current: boolean
}

/** An occupation written by its name, as a draft or the API names it */
export interface NamedOccupation {
  name: string
  current: boolean
}

/**
 * The assignments the written names designate among the listed occupations,
 * or the first name that designates none: the list is closed, and a name
 * outside it is refused rather than created.
 */
export function assignmentsFromNames(
  listed: Occupation[],
  named: NamedOccupation[],
): { assignments: OccupationAssignmentInput[] } | { unknown: string } {
  const assignments: OccupationAssignmentInput[] = []
  for (const { name, current } of named) {
    const match = listed.find((candidate) => sameOccupationName(name, candidate.name))
    if (!match) return { unknown: name }
    assignments.push({ occupationId: match.id, current })
  }
  return { assignments }
}

/** Current occupations first, then the former ones, each by name */
export function sortOccupationsHeld(held: OccupationHeld[]): OccupationHeld[] {
  return [...held].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      a.occupation.name.localeCompare(b.occupation.name, 'fr'),
  )
}
