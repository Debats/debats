import { Occupation } from '../entities/occupation'
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

/** Current occupations first, then the former ones, each by name */
export function sortOccupationsHeld(held: OccupationHeld[]): OccupationHeld[] {
  return [...held].sort(
    (a, b) =>
      Number(b.current) - Number(a.current) ||
      a.occupation.name.localeCompare(b.occupation.name, 'fr'),
  )
}

/** The page of a family */
export const occupationFamilyHref = (family: { slug: string }): string => `/metiers/${family.slug}`
