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
import { DatabaseError } from '../../domain/repositories/errors'
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

/** Les lectures indépendantes partent ensemble : `Effect.all` est séquentiel par défaut */
const PARALLEL = { concurrency: 'unbounded' } as const

/**
 * Ce que les pages « un auteur sur un sujet » lisent autour des prises de
 * position de leur auteur. Deux fonctions, une par page : les deux pages ne
 * montrent pas la même identité, et une seule fonction qui rendrait les deux
 * obligerait chaque page à ignorer la moitié de sa réponse.
 *
 * Chacune rend **un** Effect, que la page lance une fois : une
 * `DatabaseError` reste typée jusque là, au lieu de devenir une exception à
 * chacune des onze lectures.
 *
 * Ces fonctions lisent les tables et rien d'autre : ce qui fait un groupe
 * est dit par `domain/services/author-groups.ts`, ce qui fait un sujet
 * voisin et une voix par `author-on-subject.ts`.
 */

/** La page d'une personnalité sur un sujet : ses métiers, ses affiliations */
export function loadFigureSubjectPage(
  supabase: Client,
  figure: { id: string },
  subject: SubjectRef,
  /** Les positions que la personnalité défend sur ce sujet */
  hers: ReadonlySet<string>,
  today: Date,
): Effect.Effect<FigureSubjectPage, DatabaseError> {
  const self = publicFigureAuthor(figure.id)

  return Effect.all(
    {
      around: subjectAround(supabase, self, subject),
      memberships: createOrganisationMembershipRepository(supabase).findByPublicFigureId(figure.id),
      totals: figureTotals(supabase, figure.id),
    },
    PARALLEL,
  ).pipe(
    Effect.flatMap(({ around, memberships, totals }) => {
      const current = memberships.filter(({ membership }) => isCurrentMembership(membership, today))
      const figureIds = figuresOnSubject(around.subjectStatements, self)

      return Effect.map(
        figureGroups(supabase, figure.id, figureIds, current, today),
        (groups): FigureSubjectPage => ({
          ...context(around, self, hers, groups, totals),
          occupations: occupationsOf(around.held, figure.id),
          organisations: current.map(({ organisation }) => affiliationOf(organisation)),
        }),
      )
    }),
  )
}

/** La page d'une organisation sur un sujet : ses membres */
export function loadOrganisationSubjectPage(
  supabase: Client,
  organisation: Affiliation & { id: string },
  subject: SubjectRef,
  /** Les positions que l'organisation défend sur ce sujet */
  hers: ReadonlySet<string>,
  today: Date,
): Effect.Effect<OrganisationSubjectPage, DatabaseError> {
  const self = organisationAuthor(organisation.id)

  return Effect.map(
    Effect.all(
      {
        around: subjectAround(supabase, self, subject),
        summary: createOrganisationRepository(supabase).findSummaryById(organisation.id),
        memberIds: memberIdsOf(supabase, organisation.id, today),
      },
      PARALLEL,
    ),
    ({ around, summary, memberIds }): OrganisationSubjectPage => {
      const itself: MemberedOrganisation = {
        ...affiliationOf(organisation),
        id: organisation.id,
        memberIds,
      }
      const totals = {
        subjects: summary?.subjectsCount ?? 0,
        statements: summary?.statementsCount ?? 0,
      }

      return {
        ...context(around, self, hers, organisationGroups([itself]), totals),
        // Les mêmes membres que le groupe auquel la page compare l'organisation :
        // ceux dont l'affiliation est en cours, et non tous ceux qui l'ont été.
        members: memberIds.length,
      }
    },
  )
}

/** Ce que les deux pages lisent du sujet et du débat autour */
interface SubjectAround {
  /** Toutes les prises de position du sujet, tous auteurs confondus */
  subjectStatements: StatementWithAuthor[]
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
function subjectAround(
  supabase: Client,
  self: StatementAuthor,
  subject: SubjectRef,
): Effect.Effect<SubjectAround, DatabaseError> {
  const statements = createStatementRepository(supabase)

  return Effect.all(
    {
      subjectStatements: statements.findBySubjectWithAuthors(subject.id),
      positions: createPositionRepository(supabase).findBySubjectId(subject.id),
      span: statements.findStatedSpanBySubjectId(subject.id),
      related: createRelatedSubjectsRepository(supabase).findRelated(subject.id),
    },
    PARALLEL,
  ).pipe(
    // Ces deux-là dépendent des premières : qui parle sur le sujet, et quels
    // sujets lui sont liés.
    Effect.flatMap((subjectWide) =>
      Effect.all(
        {
          held: createOccupationRepository(supabase).findCurrentHeldByPublicFigureIds(
            figuresOnSubject(subjectWide.subjectStatements, self),
          ),
          onNeighbours: statements.findByAuthorAndSubjectIds(
            self,
            subjectWide.related.map(({ id }) => id),
          ),
        },
        PARALLEL,
      ).pipe(Effect.map((aroundTheSubject) => ({ ...subjectWide, ...aroundTheSubject }))),
    ),
  )
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
    subjectStatements: around.subjectStatements,
    positions: around.positions.map(({ id, title, slug }) => ({ id, title, slug })),
    span: around.span,
    roles: rolesByFigure(around.held),
    alignment: alignOnSubject(voicesOf(around.subjectStatements), hers, authorKey(self), groups),
    neighbours: neighboursOf(around.related, around.onNeighbours),
    ...totals,
  }
}

const affiliationOf = (organisation: Affiliation): Affiliation => ({
  name: organisation.name,
  slug: organisation.slug,
  acronym: organisation.acronym,
})

/** Les métiers que la personnalité de la page tient aujourd'hui, par ordre alphabétique */
const occupationsOf = (held: readonly FigureOccupation[], figureId: string): string[] =>
  held
    .filter(({ publicFigureId }) => publicFigureId === figureId)
    .map(({ occupation }) => occupation.name)
    .sort((a, b) => a.localeCompare(b, 'fr'))

/** Les compteurs d'une personnalité, lus sur la projection qui les agrège déjà */
function figureTotals(
  supabase: Client,
  figureId: string,
): Effect.Effect<Pick<SubjectContext, 'subjects' | 'statements'>, DatabaseError> {
  return Effect.map(
    createPublicFigureRepository(supabase).findSummariesByIds([figureId]),
    ([summary]) => ({
      subjects: summary?.subjectsCount ?? 0,
      statements: summary?.statementsCount ?? 0,
    }),
  )
}

/**
 * Les groupes auxquels une personnalité se compare : ses organisations en
 * cours, et ses familles de métiers. L'infrastructure lit, le domaine dit
 * ce qui fait un groupe.
 */
function figureGroups(
  supabase: Client,
  figureId: string,
  figureIds: string[],
  current: MembershipWithOrganisation[],
  today: Date,
): Effect.Effect<GroupDefinition[], DatabaseError> {
  const occupations = createOccupationRepository(supabase)

  return Effect.all(
    {
      organisations: membered(
        supabase,
        current.map(({ organisation }) => organisation),
        today,
      ),
      assignments: occupations.findAssignmentsByPublicFigureIds(figureIds),
      families: createOccupationFamilyRepository(supabase).findAll(),
    },
    PARALLEL,
  ).pipe(
    Effect.flatMap(({ organisations, assignments, families }) =>
      Effect.map(
        // Seuls les métiers effectivement tenus par ces personnes, pas toute la liste
        occupations.findByIds(Array.from(new Set(assignments.map((a) => a.occupationId)))),
        (held) => [
          ...organisationGroups(organisations),
          ...occupationFamilyGroups(figureId, families, assignments, held),
        ],
      ),
    ),
  )
}

/** Une seule lecture pour toutes ces organisations, jamais une par affiliation */
function membered(
  supabase: Client,
  organisations: ReadonlyArray<Affiliation & { id: string }>,
  today: Date,
): Effect.Effect<MemberedOrganisation[], DatabaseError> {
  if (organisations.length === 0) return Effect.succeed([])

  return Effect.map(
    currentMembers(
      supabase,
      organisations.map(({ id }) => id),
      today,
    ),
    (byOrganisation) =>
      organisations.map((organisation) => ({
        id: organisation.id,
        ...affiliationOf(organisation),
        memberIds: byOrganisation.get(organisation.id) ?? [],
      })),
  )
}

/** Les personnalités affiliées à cette organisation aujourd'hui */
function memberIdsOf(
  supabase: Client,
  organisationId: string,
  today: Date,
): Effect.Effect<string[], DatabaseError> {
  return Effect.map(
    currentMembers(supabase, [organisationId], today),
    (byOrganisation) => byOrganisation.get(organisationId) ?? [],
  )
}

/** Les membres actuels de ces organisations, par organisation */
function currentMembers(
  supabase: Client,
  organisationIds: string[],
  today: Date,
): Effect.Effect<Map<string, string[]>, DatabaseError> {
  return Effect.map(
    createOrganisationMembershipRepository(supabase).findByOrganisationIds(organisationIds),
    (links) => {
      const byOrganisation = new Map<string, string[]>()
      for (const { membership, figure } of links) {
        if (!isCurrentMembership(membership, today)) continue
        const members = byOrganisation.get(membership.organisationId) ?? []
        members.push(figure.id)
        byOrganisation.set(membership.organisationId, members)
      }
      return byOrganisation
    },
  )
}
