import { SupabaseClient } from '@supabase/supabase-js'
import { Effect } from 'effect'
import { Database } from '../../types/database.types'
import {
  organisationAuthor,
  publicFigureAuthor,
  StatementAuthor,
} from '../../domain/entities/statement'
import { isCurrentMembership } from '../../domain/entities/organisation-membership'
import {
  Affiliation,
  FigureSubjectPage,
  OrganisationSubjectPage,
  SubjectContext,
} from '../../domain/read-models/author-subject-page'
import { FigureOccupation, rolesByFigure } from '../../domain/read-models/author-role'
import { Position } from '../../domain/entities/position'
import { Subject } from '../../domain/entities/subject'
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
import {
  authorKey,
  figuresOnSubject,
  neighboursOf,
  voicesOf,
} from '../../domain/services/author-on-subject'
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

interface SubjectRef {
  id: string
}

/**
 * Ce que les pages « un auteur sur un sujet » lisent autour des prises de
 * position de leur auteur. Deux fonctions, une par page : les deux pages ne
 * montrent pas la même identité, et une seule fonction qui rendrait les deux
 * obligerait chaque page à ignorer la moitié de sa réponse.
 *
 * Ces fonctions lisent les tables et rien d'autre : ce qui fait un groupe
 * est dit par `domain/services/author-groups.ts`, ce qui fait un sujet
 * voisin et une voix par `author-on-subject.ts`.
 */

/** La page d'une personnalité sur un sujet : ses métiers, ses affiliations */
export async function loadFigureSubjectPage(
  supabase: Client,
  figure: { id: string },
  subject: SubjectRef,
  /** Les positions que la personnalité défend sur ce sujet */
  hers: ReadonlySet<string>,
  today: Date,
): Promise<FigureSubjectPage> {
  const self = publicFigureAuthor(figure.id)

  const [around, memberships, totals] = await Promise.all([
    subjectAround(supabase, self, subject),
    Effect.runPromise(
      createOrganisationMembershipRepository(supabase).findByPublicFigureId(figure.id),
    ),
    figureTotals(supabase, figure.id),
  ])

  const current = memberships.filter(({ membership }) => isCurrentMembership(membership, today))
  const groups = await figureGroups(
    supabase,
    figure.id,
    figuresOnSubject(around.everyone, self),
    current,
    today,
  )

  return {
    ...context(around, self, hers, groups, totals),
    occupations: around.held
      .filter(({ publicFigureId }) => publicFigureId === figure.id)
      .map(({ occupation }) => occupation.name)
      .sort((a, b) => a.localeCompare(b, 'fr')),
    organisations: current.map(({ organisation }) => affiliationOf(organisation)),
  }
}

/** La page d'une organisation sur un sujet : ses membres */
export async function loadOrganisationSubjectPage(
  supabase: Client,
  organisation: Affiliation & { id: string },
  subject: SubjectRef,
  /** Les positions que l'organisation défend sur ce sujet */
  hers: ReadonlySet<string>,
  today: Date,
): Promise<OrganisationSubjectPage> {
  const self = organisationAuthor(organisation.id)

  const [around, summary, memberIds] = await Promise.all([
    subjectAround(supabase, self, subject),
    Effect.runPromise(createOrganisationRepository(supabase).findSummaryById(organisation.id)),
    memberIdsOf(supabase, organisation.id, today),
  ])

  const totals = {
    subjects: summary?.subjectsCount ?? 0,
    statements: summary?.statementsCount ?? 0,
  }
  const itself: MemberedOrganisation = {
    ...affiliationOf(organisation),
    id: organisation.id,
    memberIds,
  }

  return {
    ...context(around, self, hers, organisationGroups([itself]), totals),
    // Les mêmes membres que le groupe auquel la page compare l'organisation :
    // ceux dont l'affiliation est en cours, et non tous ceux qui l'ont été.
    members: memberIds.length,
  }
}

/** Ce que les deux pages lisent du sujet et du débat autour */
interface SubjectAround {
  /** Toutes les prises de position du sujet, tous auteurs confondus */
  everyone: StatementWithAuthor[]
  /** Les positions ouvertes, celles que personne n'a prises comprises */
  positions: Position[]
  span: StatedSpan | null
  /** Les sujets liés à celui-ci */
  related: Subject[]
  /** Les métiers actuels des personnalités du sujet, l'auteur compris */
  held: FigureOccupation[]
  /** Les prises de position de l'auteur sur les sujets liés */
  onNeighbours: StatementWithDetails[]
}

/** Les lectures que les deux pages partagent */
async function subjectAround(
  supabase: Client,
  self: StatementAuthor,
  subject: SubjectRef,
): Promise<SubjectAround> {
  const statements = createStatementRepository(supabase)

  const [everyone, positions, span, related] = await Promise.all([
    Effect.runPromise(statements.findBySubjectWithAuthors(subject.id)),
    Effect.runPromise(createPositionRepository(supabase).findBySubjectId(subject.id)),
    Effect.runPromise(statements.findStatedSpanBySubjectId(subject.id)),
    Effect.runPromise(createRelatedSubjectsRepository(supabase).findRelated(subject.id)),
  ])

  const [held, onNeighbours] = await Promise.all([
    Effect.runPromise(
      createOccupationRepository(supabase).findCurrentHeldByPublicFigureIds(
        figuresOnSubject(everyone, self),
      ),
    ),
    Effect.runPromise(
      statements.findByAuthorAndSubjectIds(
        self,
        related.map(({ id }) => id),
      ),
    ),
  ])

  return { everyone, positions, span, related, held, onNeighbours }
}

/** Ce que les deux pages tirent des mêmes lectures */
function context(
  around: SubjectAround,
  self: StatementAuthor,
  hers: ReadonlySet<string>,
  groups: GroupDefinition[],
  totals: Pick<SubjectContext, 'subjects' | 'statements'>,
): SubjectContext {
  return {
    everyone: around.everyone,
    positions: around.positions.map(({ id, title, slug }) => ({ id, title, slug })),
    span: around.span,
    roles: rolesByFigure(around.held),
    alignment: alignOnSubject(voicesOf(around.everyone), hers, authorKey(self), groups),
    neighbours: neighboursOf(around.related, around.onNeighbours),
    ...totals,
  }
}

const affiliationOf = (organisation: Affiliation): Affiliation => ({
  name: organisation.name,
  slug: organisation.slug,
  acronym: organisation.acronym,
})

/** Les compteurs d'une personnalité, lus sur la projection qui les agrège déjà */
async function figureTotals(
  supabase: Client,
  figureId: string,
): Promise<Pick<SubjectContext, 'subjects' | 'statements'>> {
  const [summary] = await Effect.runPromise(
    createPublicFigureRepository(supabase).findSummariesByIds([figureId]),
  )
  return { subjects: summary?.subjectsCount ?? 0, statements: summary?.statementsCount ?? 0 }
}

/**
 * Les groupes auxquels une personnalité se compare : ses organisations en
 * cours, et ses familles de métiers. L'infrastructure lit, le domaine dit
 * ce qui fait un groupe.
 */
async function figureGroups(
  supabase: Client,
  figureId: string,
  figureIds: string[],
  current: MembershipWithOrganisation[],
  today: Date,
): Promise<GroupDefinition[]> {
  const occupations = createOccupationRepository(supabase)

  const [organisations, assignments, families] = await Promise.all([
    membered(
      supabase,
      current.map(({ organisation }) => organisation),
      today,
    ),
    Effect.runPromise(occupations.findAssignmentsByPublicFigureIds(figureIds)),
    Effect.runPromise(createOccupationFamilyRepository(supabase).findAll()),
  ])

  // Seuls les métiers effectivement tenus par ces personnes, pas toute la liste
  const held = await Effect.runPromise(
    occupations.findByIds(Array.from(new Set(assignments.map((a) => a.occupationId)))),
  )

  return [
    ...organisationGroups(organisations),
    ...occupationFamilyGroups(figureId, families, assignments, held),
  ]
}

/** Une seule lecture pour toutes ces organisations, jamais une par affiliation */
async function membered(
  supabase: Client,
  organisations: ReadonlyArray<Affiliation & { id: string }>,
  today: Date,
): Promise<MemberedOrganisation[]> {
  if (organisations.length === 0) return []

  const byOrganisation = await currentMembers(
    supabase,
    organisations.map(({ id }) => id),
    today,
  )

  return organisations.map((organisation) => ({
    id: organisation.id,
    ...affiliationOf(organisation),
    memberIds: byOrganisation.get(organisation.id) ?? [],
  }))
}

/** Les personnalités affiliées à cette organisation aujourd'hui */
async function memberIdsOf(supabase: Client, organisationId: string, today: Date) {
  const byOrganisation = await currentMembers(supabase, [organisationId], today)
  return byOrganisation.get(organisationId) ?? []
}

/** Les membres actuels de ces organisations, par organisation */
async function currentMembers(
  supabase: Client,
  organisationIds: string[],
  today: Date,
): Promise<Map<string, string[]>> {
  const links = await Effect.runPromise(
    createOrganisationMembershipRepository(supabase).findByOrganisationIds(organisationIds),
  )

  const byOrganisation = new Map<string, string[]>()
  for (const { membership, figure } of links) {
    if (!isCurrentMembership(membership, today)) continue
    const members = byOrganisation.get(membership.organisationId) ?? []
    members.push(figure.id)
    byOrganisation.set(membership.organisationId, members)
  }
  return byOrganisation
}
