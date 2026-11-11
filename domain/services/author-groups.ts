/**
 * Les groupes auxquels un auteur appartient sur un sujet, et à qui la carte
 * « avec qui est-il raccord » le compare : chacune de ses organisations en
 * cours, chacune de ses familles de métiers. Une organisation, elle, n'a
 * qu'un groupe : ses propres membres.
 *
 * Fonctions pures : l'infrastructure lit les tables, c'est ici qu'on dit
 * ce qui fait un groupe.
 */

import { Occupation } from '../entities/occupation'
import { OccupationFamily } from '../entities/occupation-family'
import { occupationFamilyHref, organisationHref } from '../read-models/hrefs'
import { authorKey } from './author-on-subject'
import { GroupDefinition } from './group-alignment'
import { familiesByFigure, OccupationAssignment } from './occupation-distribution'

const figureKey = (id: string) => authorKey({ kind: 'public_figure', id })

/** Une organisation et les personnalités qui en sont membres aujourd'hui */
export interface MemberedOrganisation {
  id: string
  name: string
  slug: string
  acronym: string | null
  memberIds: string[]
}

/** Un groupe par organisation : ses membres actuels */
export function organisationGroups(
  organisations: readonly MemberedOrganisation[],
): GroupDefinition[] {
  return organisations.map((organisation) => ({
    key: `organisation-${organisation.id}`,
    kind: 'organisation' as const,
    label: `Membres de ${organisation.acronym ?? organisation.name}`,
    href: organisationHref(organisation.slug),
    members: new Set(organisation.memberIds.map(figureKey)),
  }))
}

/**
 * Un groupe par famille de métiers de l'auteur : les personnalités qui la
 * partagent. Une famille à laquelle l'auteur n'appartient pas n'est pas un
 * groupe auquel le comparer.
 */
export function occupationFamilyGroups(
  authorId: string,
  families: readonly OccupationFamily[],
  assignments: OccupationAssignment[],
  occupations: Occupation[],
): GroupDefinition[] {
  const byFigure = familiesByFigure(assignments, occupations)
  const hers = byFigure.get(authorId)
  if (!hers) return []

  const members = new Map<string, Set<string>>()
  byFigure.forEach((familyIds, figureId) => {
    familyIds.forEach((familyId) => {
      if (!hers.has(familyId)) return
      const set = members.get(familyId) ?? new Set<string>()
      set.add(figureKey(figureId))
      members.set(familyId, set)
    })
  })

  return families
    .filter((family) => hers.has(family.id))
    .map((family) => ({
      key: `family-${family.id}`,
      kind: 'occupation_family' as const,
      label: family.name,
      href: occupationFamilyHref(family),
      members: members.get(family.id) ?? new Set<string>(),
    }))
}
