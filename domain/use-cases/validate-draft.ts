import { Effect, pipe } from 'effect'
import {
  DraftAffiliation,
  DraftAuthor,
  DraftOrganisationData,
  DraftStatement,
} from '../entities/draft-statement'
import { generateSlug as generatePublicFigureSlug } from '../entities/public-figure'
import { generateOrganisationSlug } from '../entities/organisation'
import { generateSlug as generateSubjectSlug } from '../entities/subject'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { PositionRepository } from '../repositories/position-repository'
import { DatabaseError } from '../repositories/errors'
import { RunUnitOfWork } from '../events/unit-of-work'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { OccupationRepository } from '../repositories/occupation-repository'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { sameOccupationName } from '../entities/occupation'
import { isCurrentMembership } from '../entities/organisation-membership'
import { setPublicFigureOccupationsUseCase } from './set-public-figure-occupations'
import { addOrganisationMembershipUseCase } from './add-organisation-membership'
import { createPublicFigureUseCase } from './create-public-figure'
import { createOrganisationUseCase } from './create-organisation'
import { createSubjectUseCase } from './create-subject'
import { createPositionUseCase } from './create-position'
import { createStatementUseCase } from './create-statement'
import { organisationAuthor, publicFigureAuthor, StatementAuthor } from '../entities/statement'
import { ContributorIdentity, Rejected } from './types'
import { allowedTo, found } from './preconditions'
import { CommandFailure, FormFailure } from './run-command'

type ValidateDraftParams = {
  draftId: string
  contributor: ContributorIdentity | null
}

/** Read side: the draft, and what the site already knows of what it names */
const drafts = Effect.serviceFunctions(DraftStatementRepository)
const figures = Effect.serviceFunctions(PublicFigureRepository)
const organisations = Effect.serviceFunctions(OrganisationRepository)
const subjects = Effect.serviceFunctions(SubjectRepository)
const positions = Effect.serviceFunctions(PositionRepository)
const occupations = Effect.serviceFunctions(OccupationRepository)
const memberships = Effect.serviceFunctions(OrganisationMembershipRepository)

/** What a command behind a form says, told as one message: the draft has no form to blame a field on */
const toldAsOne = <A, R>(
  command: Effect.Effect<A, FormFailure, R>,
): Effect.Effect<A, CommandFailure, R> =>
  Effect.catchTag(command, 'Invalid', (invalid) =>
    Effect.fail(new Rejected(Object.values(invalid.fields).join(' '))),
  )

/** The id of what the site knows under that name, or of what the draft lets the site create */
const knownOrCreated = <R1, R2>(
  lookup: Effect.Effect<{ id: string } | null, DatabaseError, R1>,
  create: () => Effect.Effect<{ id: string }, CommandFailure, R2>,
): Effect.Effect<string, CommandFailure, R1 | R2> =>
  Effect.flatMap(lookup, (known) =>
    known ? Effect.succeed(known.id) : Effect.map(create(), (created) => created.id),
  )

const missingData = (what: string) =>
  Effect.fail(new Rejected(`Données manquantes pour créer ${what}.`))

/**
 * Turns a reviewed draft into a statement: the author, the subject and the
 * position are reused when the site knows them, created from the draft's data
 * otherwise; what the draft says of the person herself is applied first; each
 * command runs in its own transaction, and the draft is marked validated last.
 */
export function validateDraft(params: ValidateDraftParams) {
  const { draftId } = params

  return pipe(
    allowedTo(params.contributor, 'admin', 'valider un brouillon'),
    Effect.bindTo('contributor'),
    Effect.bind('draft', () =>
      Effect.flatMap(drafts.findById(draftId), found('Brouillon introuvable.')),
    ),
    Effect.bind('author', ({ draft, contributor }) => authorOf(draft.author, contributor)),
    // What the draft says of the person herself, applied before the statement so
    // that a wrong occupation or affiliation stops the draft instead of landing
    // a statement whose author stays half documented.
    Effect.tap(({ draft, author, contributor }) =>
      author.kind === 'public_figure'
        ? Effect.andThen(
            occupationsApplied(draft, author.id, contributor),
            affiliationsApplied(draft, author.id, contributor),
          )
        : Effect.void,
    ),
    Effect.bind('subjectId', ({ draft, contributor }) => subjectOf(draft, contributor)),
    Effect.bind('positionId', ({ draft, subjectId, contributor }) =>
      positionOf(draft, subjectId, contributor),
    ),
    Effect.flatMap(({ draft, author, subjectId, positionId, contributor }) =>
      toldAsOne(
        createStatementUseCase({
          contributor,
          subjectId,
          author,
          positionId,
          statementType: draft.statementType,
          sourceName: draft.sourceName,
          sourceUrl: draft.sourceUrl,
          quote: draft.quote,
          statedAt: draft.date,
          // Titles only: an existing argument is reused, a new one created.
          arguments: {
            argumentIds: [],
            newArguments: draft.arguments.map(({ title, description }) => ({
              title,
              description: description ?? '',
            })),
          },
        }),
      ),
    ),
    Effect.andThen(() => drafts.updateStatus(draftId, 'validated')),
    Effect.asVoid,
  )
}

/** What creating an author, a subject or a position from the draft asks for */
type CreationServices =
  | RunUnitOfWork
  | WikipediaValidator
  | PublicFigureRepository
  | OrganisationRepository
  | SubjectRepository

function authorOf(
  author: DraftAuthor,
  contributor: ContributorIdentity,
): Effect.Effect<StatementAuthor, CommandFailure, CreationServices> {
  return author.kind === 'public_figure'
    ? Effect.map(
        knownOrCreated(figures.findBySlug(generatePublicFigureSlug(author.name)), () =>
          createdPublicFigure(author, contributor),
        ),
        publicFigureAuthor,
      )
    : Effect.map(
        knownOrCreated(organisations.findBySlug(generateOrganisationSlug(author.name)), () =>
          createdOrganisation(author.name, author.data, contributor),
        ),
        organisationAuthor,
      )
}

function createdPublicFigure(
  author: Extract<DraftAuthor, { kind: 'public_figure' }>,
  contributor: ContributorIdentity,
) {
  return author.data
    ? toldAsOne(
        createPublicFigureUseCase({
          contributor,
          name: author.name,
          presentation: author.data.presentation,
          wikipediaUrl: author.data.wikipediaUrl ?? '',
          websiteUrl: author.data.websiteUrl ?? '',
          notorietySources: author.data.notorietySources ?? [],
        }),
      )
    : missingData(`la personnalité « ${author.name} »`)
}

function createdOrganisation(
  name: string,
  data: DraftOrganisationData | null | undefined,
  contributor: ContributorIdentity,
) {
  return data
    ? toldAsOne(
        createOrganisationUseCase({
          contributor,
          name,
          acronym: data.acronym ?? '',
          organisationType: data.organisationType,
          presentation: data.presentation,
          wikipediaUrl: data.wikipediaUrl ?? '',
          websiteUrl: data.websiteUrl ?? '',
          notorietySources: data.notorietySources ?? [],
        }),
      )
    : missingData(`l'organisation « ${name} »`)
}

/**
 * Assigns the occupations the draft names to the public figure, keeping those
 * she already holds: a draft documents one statement, it does not redefine a
 * career. Every name must designate a listed occupation.
 */
function occupationsApplied(
  draft: DraftStatement,
  publicFigureId: string,
  contributor: ContributorIdentity,
) {
  if (draft.occupations.length === 0) return Effect.void

  const drafted = Effect.flatMap(occupations.findAll(), (listed) =>
    Effect.forEach(draft.occupations, (occupation) => {
      const match = listed.find((candidate) => sameOccupationName(occupation.name, candidate.name))
      return match
        ? Effect.succeed({ occupationId: match.id, current: occupation.current })
        : Effect.fail(new Rejected(`Le métier « ${occupation.name} » n’est pas dans la liste.`))
    }),
  )
  const held = Effect.map(occupations.findByPublicFigureId(publicFigureId), (held) =>
    held.map(({ occupation, current }) => ({ occupationId: occupation.id, current })),
  )

  return pipe(
    Effect.all({ drafted, held }),
    Effect.flatMap(({ drafted, held }) =>
      setPublicFigureOccupationsUseCase({
        contributor,
        publicFigureId,
        assignments: [...held, ...drafted],
      }),
    ),
    Effect.asVoid,
  )
}

/**
 * Affiliates the public figure to the organisations the draft names, creating
 * those the catalogue lacks. An affiliation already running is left as it is:
 * restating a known fact changes nothing.
 */
function affiliationsApplied(
  draft: DraftStatement,
  publicFigureId: string,
  contributor: ContributorIdentity,
) {
  return Effect.forEach(
    draft.affiliations,
    (affiliation) => affiliated(affiliation, publicFigureId, contributor),
    { discard: true },
  )
}

function affiliated(
  affiliation: DraftAffiliation,
  publicFigureId: string,
  contributor: ContributorIdentity,
) {
  const alreadyRunning = (organisationId: string) =>
    Effect.map(memberships.findByOrganisationId(organisationId), (affiliations) =>
      affiliations.some(
        ({ membership }) =>
          membership.publicFigureId === publicFigureId && isCurrentMembership(membership),
      ),
    )
  const added = (organisationId: string) =>
    pipe(
      toldAsOne(
        addOrganisationMembershipUseCase({
          contributor,
          organisationId,
          publicFigureId,
          role: affiliation.role ?? '',
          startedOn: affiliation.startedOn ?? '',
          endedOn: affiliation.endedOn ?? '',
        }),
      ),
      Effect.catchTag('Rejected', (refused) =>
        Effect.fail(
          new Rejected(`Affiliation à « ${affiliation.organisation} » : ${refused.message}`),
        ),
      ),
      Effect.asVoid,
    )

  return pipe(
    knownOrCreated(
      organisations.findBySlug(generateOrganisationSlug(affiliation.organisation)),
      () =>
        createdOrganisation(affiliation.organisation, affiliation.organisationData, contributor),
    ),
    Effect.flatMap((organisationId) =>
      Effect.flatMap(alreadyRunning(organisationId), (running) =>
        running ? Effect.void : added(organisationId),
      ),
    ),
  )
}

function subjectOf(draft: DraftStatement, contributor: ContributorIdentity) {
  return knownOrCreated(subjects.findBySlug(generateSubjectSlug(draft.subjectTitle)), () =>
    draft.subjectData
      ? toldAsOne(
          createSubjectUseCase({
            contributor,
            title: draft.subjectTitle,
            presentation: draft.subjectData.presentation,
            problem: draft.subjectData.problem,
          }),
        )
      : missingData(`le sujet « ${draft.subjectTitle} »`),
  )
}

function positionOf(draft: DraftStatement, subjectId: string, contributor: ContributorIdentity) {
  return knownOrCreated(
    Effect.map(
      positions.findBySubjectId(subjectId),
      (onSubject) => onSubject.find((p) => p.title === draft.positionTitle) ?? null,
    ),
    () =>
      draft.positionData
        ? toldAsOne(
            createPositionUseCase({
              contributor,
              subjectId,
              title: draft.positionTitle,
              description: draft.positionData.description,
            }),
          )
        : missingData(`la position « ${draft.positionTitle} »`),
  )
}
