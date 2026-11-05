import { SupabaseClient } from '@supabase/supabase-js'
import { Effect } from 'effect'
import { Database } from '../../types/database.types'
import { StatementAuthor } from '../../domain/entities/statement'
import { isCurrentMembership } from '../../domain/entities/organisation-membership'
import { AuthorProfile, AuthorSubjectPage } from '../../domain/read-models/author-subject-page'
import { rolesByFigure } from '../../domain/read-models/author-role'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { MembershipWithOrganisation } from '../../domain/repositories/organisation-membership-repository'
import {
  MemberedOrganisation,
  occupationFamilyGroups,
  organisationGroups,
} from '../../domain/services/author-groups'
import { authorKey, neighboursOf, voicesOf } from '../../domain/services/author-on-subject'
import { alignOnSubject, GroupDefinition } from '../../domain/services/group-alignment'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { createPositionRepository } from '../database/position-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../database/occupation-family-repository-supabase'
import { createOrganisationRepository } from '../database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../database/organisation-membership-repository-supabase'
import { createPublicFigureRepository } from '../database/public-figure-repository-supabase'
import { createRelatedSubjectsRepository } from '../database/related-subjects-repository-supabase'

type Client = SupabaseClient<Database>

/**
 * Tout ce que la page « un auteur sur un sujet » lit en plus de ses propres
 * prises de position : le débat autour, les groupes auxquels l'auteur
 * appartient, les sujets voisins et sa carte de visite. Partagé par les
 * routes personnalité et organisation, qui n'en diffèrent que par l'auteur.
 *
 * Cette fonction lit les tables et rien d'autre : ce qui fait un groupe est
 * dit par `domain/services/author-groups.ts`, ce qui fait un sujet voisin
 * par `author-on-subject.ts`.
 */
export async function loadAuthorSubjectPage(
  supabase: Client,
  author: StatementAuthorRef,
  subject: { id: string },
  /** Les positions que l'auteur défend sur ce sujet */
  hers: ReadonlySet<string>,
  today: Date,
): Promise<AuthorSubjectPage> {
  const statements = createStatementRepository(supabase)
  const occupations = createOccupationRepository(supabase)
  const membershipsRepo = createOrganisationMembershipRepository(supabase)
  const isFigure = author.kind === 'public_figure'
  const self: StatementAuthor = isFigure
    ? { kind: 'public_figure', id: author.id }
    : { kind: 'organisation', id: author.id }

  const [everyone, positions, span, related, memberships] = await Promise.all([
    Effect.runPromise(statements.findBySubjectWithAuthors(subject.id)),
    Effect.runPromise(createPositionRepository(supabase).findBySubjectId(subject.id)),
    Effect.runPromise(statements.findStatedSpanBySubjectId(subject.id)),
    Effect.runPromise(createRelatedSubjectsRepository(supabase).findRelated(subject.id)),
    isFigure
      ? Effect.runPromise(membershipsRepo.findByPublicFigureId(author.id))
      : Promise.resolve<MembershipWithOrganisation[]>([]),
  ])

  // L'auteur est de la partie même s'il ne s'est pas exprimé : ses métiers
  // nomment la ligne de rôle, et ses familles font ses groupes.
  const figureIds = Array.from(
    new Set([
      ...everyone
        .filter((statement) => statement.author.kind === 'public_figure')
        .map((statement) => statement.author.id),
      ...(isFigure ? [author.id] : []),
    ]),
  )
  const current = memberships.filter(({ membership }) => isCurrentMembership(membership, today))

  const [held, groups, onNeighbours, totals] = await Promise.all([
    Effect.runPromise(occupations.findCurrentHeldByPublicFigureIds(figureIds)),
    groupsOf(supabase, author, figureIds, current, today),
    Effect.runPromise(
      statements.findByAuthorAndSubjectIds(
        self,
        related.map(({ id }) => id),
      ),
    ),
    totalsOf(supabase, author),
  ])

  return {
    everyone,
    positions: positions.map(({ id, title, slug }) => ({ id, title, slug })),
    span,
    roles: rolesByFigure(held),
    alignment: alignOnSubject(voicesOf(everyone), hers, authorKey(self), groups),
    neighbours: neighboursOf(related, onNeighbours),
    profile: {
      occupations: held
        .filter(({ publicFigureId }) => publicFigureId === author.id)
        .map(({ occupation }) => occupation.name)
        .sort((a, b) => a.localeCompare(b, 'fr')),
      organisations: current.map(({ organisation }) => ({
        name: organisation.name,
        slug: organisation.slug,
        acronym: organisation.acronym,
      })),
      ...totals,
    },
  }
}

/** Les compteurs de l'auteur, lus sur la projection qui les agrège déjà */
async function totalsOf(
  supabase: Client,
  author: StatementAuthorRef,
): Promise<Pick<AuthorProfile, 'subjects' | 'statements'>> {
  if (author.kind === 'organisation') {
    const summary = await Effect.runPromise(
      createOrganisationRepository(supabase).findSummaryById(author.id),
    )
    return { subjects: summary?.subjectsCount ?? 0, statements: summary?.statementsCount ?? 0 }
  }

  const [summary] = await Effect.runPromise(
    createPublicFigureRepository(supabase).findSummariesByIds([author.id]),
  )
  return { subjects: summary?.subjectsCount ?? 0, statements: summary?.statementsCount ?? 0 }
}

/** Lit les membres et les métiers, et laisse le domaine en faire des groupes */
async function groupsOf(
  supabase: Client,
  author: StatementAuthorRef,
  figureIds: string[],
  current: MembershipWithOrganisation[],
  today: Date,
): Promise<GroupDefinition[]> {
  const memberships = createOrganisationMembershipRepository(supabase)

  /** Une seule lecture pour toutes ses organisations, jamais une par affiliation */
  const membered = async (
    organisations: Array<{ id: string; name: string; slug: string; acronym: string | null }>,
  ): Promise<MemberedOrganisation[]> => {
    if (organisations.length === 0) return []
    const links = await Effect.runPromise(
      memberships.findByOrganisationIds(organisations.map(({ id }) => id)),
    )
    const byOrganisation = new Map<string, string[]>()
    for (const { membership, figure } of links) {
      if (!isCurrentMembership(membership, today)) continue
      const members = byOrganisation.get(membership.organisationId) ?? []
      members.push(figure.id)
      byOrganisation.set(membership.organisationId, members)
    }
    return organisations.map((organisation) => ({
      ...organisation,
      memberIds: byOrganisation.get(organisation.id) ?? [],
    }))
  }

  if (author.kind === 'organisation') {
    return organisationGroups(
      await membered([
        { id: author.id, name: author.name, slug: author.slug, acronym: author.acronym },
      ]),
    )
  }

  const occupations = createOccupationRepository(supabase)
  const [organisations, assignments, families] = await Promise.all([
    membered(current.map(({ organisation }) => organisation)),
    Effect.runPromise(occupations.findAssignmentsByPublicFigureIds(figureIds)),
    Effect.runPromise(createOccupationFamilyRepository(supabase).findAll()),
  ])

  // Seuls les métiers effectivement tenus par ces personnes, pas toute la liste
  const held = await Effect.runPromise(
    occupations.findByIds(Array.from(new Set(assignments.map((a) => a.occupationId)))),
  )

  return [
    ...organisationGroups(organisations),
    ...occupationFamilyGroups(author.id, families, assignments, held),
  ]
}
