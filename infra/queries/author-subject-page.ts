import { SupabaseClient } from '@supabase/supabase-js'
import { Effect } from 'effect'
import { Database } from '../../types/database.types'
import { StatementAuthor } from '../../domain/entities/statement'
import { isCurrentMembership } from '../../domain/entities/organisation-membership'
import { rolesByFigure } from '../../domain/read-models/author-role'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import { MembershipWithOrganisation } from '../../domain/repositories/organisation-membership-repository'
import {
  StatedSpan,
  StatementWithAuthor,
  StatementWithDetails,
} from '../../domain/repositories/statement-repository'
import {
  MemberedOrganisation,
  occupationFamilyGroups,
  organisationGroups,
} from '../../domain/services/author-groups'
import { authorKey, voicesOf } from '../../domain/services/author-on-subject'
import {
  alignOnSubject,
  GroupDefinition,
  SubjectAlignment,
} from '../../domain/services/group-alignment'
import { createStatementRepository } from '../database/statement-repository-supabase'
import { createPositionRepository } from '../database/position-repository-supabase'
import { createOccupationRepository } from '../database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../database/occupation-family-repository-supabase'
import { createOrganisationMembershipRepository } from '../database/organisation-membership-repository-supabase'
import { createRelatedSubjectsRepository } from '../database/related-subjects-repository-supabase'

type Client = SupabaseClient<Database>

/** Un sujet voisin, et ce que l'auteur y défend quand il s'y est exprimé */
export interface NeighbourSubject {
  title: string
  slug: string
  /** Les positions que l'auteur y défend, vide s'il ne s'est pas exprimé */
  positions: string[]
  statements: number
}

/** La carte de visite de l'auteur, pour le rail */
export interface AuthorProfile {
  /** Ses métiers actuels, pour la ligne de rôle */
  occupations: string[]
  /** Ses affiliations en cours */
  organisations: Array<{ name: string; slug: string; acronym: string | null }>
  subjects: number
  statements: number
}

export interface AuthorSubjectPage {
  /** Toutes les prises de position du sujet, tous auteurs confondus */
  everyone: StatementWithAuthor[]
  /** Les positions ouvertes sur le sujet, celles que personne n'a prises comprises */
  positions: Array<{ id: string; title: string; slug: string }>
  /** La période couverte par les prises de position du sujet */
  span: StatedSpan | null
  /** Le métier actuel de chaque personnalité du sujet, pour la nommer sous son nom */
  roles: Map<string, string>
  alignment: SubjectAlignment
  neighbours: NeighbourSubject[]
  profile: AuthorProfile
}

/**
 * Tout ce que la page « un auteur sur un sujet » lit en plus de ses propres
 * prises de position : le débat autour, les groupes auxquels l'auteur
 * appartient, les sujets voisins et sa carte de visite. Partagé par les
 * routes personnalité et organisation, qui n'en diffèrent que par l'auteur.
 *
 * Cette fonction lit les tables et rien d'autre : ce qui fait un groupe est
 * dit par `domain/services/author-groups.ts`.
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

  const [everyone, positions, span, related, own, memberships] = await Promise.all([
    Effect.runPromise(statements.findBySubjectWithAuthors(subject.id)),
    Effect.runPromise(createPositionRepository(supabase).findBySubjectId(subject.id)),
    Effect.runPromise(statements.findStatedSpanBySubjectId(subject.id)),
    Effect.runPromise(createRelatedSubjectsRepository(supabase).findRelated(subject.id)),
    Effect.runPromise(
      isFigure
        ? statements.findByPublicFigureWithDetails(author.id)
        : statements.findByOrganisationWithDetails(author.id),
    ),
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

  const [held, groups] = await Promise.all([
    Effect.runPromise(occupations.findCurrentHeldByPublicFigureIds(figureIds)),
    groupsOf(supabase, author, figureIds, current, today),
  ])

  const self: StatementAuthor = isFigure
    ? { kind: 'public_figure', id: author.id }
    : { kind: 'organisation', id: author.id }

  return {
    everyone,
    positions: positions.map(({ id, title, slug }) => ({ id, title, slug })),
    span,
    roles: rolesByFigure(held),
    alignment: alignOnSubject(voicesOf(everyone), hers, authorKey(self), groups),
    neighbours: neighboursOf(related, own),
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
      subjects: new Set(own.map(({ subject }) => subject.id)).size,
      statements: own.length,
    },
  }
}

/** Les sujets liés, avec ce que l'auteur y défend */
function neighboursOf(
  related: Array<{ title: string; slug: string; id: string }>,
  own: StatementWithDetails[],
): NeighbourSubject[] {
  return related.map((subject) => {
    const mine = own.filter((statement) => statement.subject.id === subject.id)
    return {
      title: subject.title,
      slug: subject.slug,
      positions: Array.from(new Set(mine.map(({ position }) => position.title))),
      statements: mine.length,
    }
  })
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
  const membersOf = async (organisation: {
    id: string
    name: string
    slug: string
    acronym: string | null
  }): Promise<MemberedOrganisation> => {
    const members = await Effect.runPromise(memberships.findByOrganisationId(organisation.id))
    return {
      ...organisation,
      memberIds: members
        .filter(({ membership }) => isCurrentMembership(membership, today))
        .map(({ figure }) => figure.id),
    }
  }

  if (author.kind === 'organisation') {
    return organisationGroups([
      await membersOf({
        id: author.id,
        name: author.name,
        slug: author.slug,
        acronym: author.acronym,
      }),
    ])
  }

  const occupations = createOccupationRepository(supabase)
  const [organisations, assignments, allOccupations, families] = await Promise.all([
    Promise.all(current.map(({ organisation }) => membersOf(organisation))),
    Effect.runPromise(occupations.findAssignmentsByPublicFigureIds(figureIds)),
    Effect.runPromise(occupations.findAll()),
    Effect.runPromise(createOccupationFamilyRepository(supabase).findAll()),
  ])

  return [
    ...organisationGroups(organisations),
    ...occupationFamilyGroups(author.id, families, assignments, allOccupations),
  ]
}
