import { Effect, Either, pipe } from 'effect'
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
import { SubjectSource } from './subject-stream'
import { PublicFigureSource } from './public-figure-stream'
import { ArgumentRepository } from '../repositories/argument-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { sameOccupationName } from '../entities/occupation'
import { isCurrentMembership } from '../entities/organisation-membership'
import { setPublicFigureOccupationsCommand } from './set-public-figure-occupations'
import { addOrganisationMembershipCommand } from './add-organisation-membership'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { createPublicFigureCommand } from './create-public-figure'
import { createOrganisationCommand } from './create-organisation'
import { createSubjectCommand } from './create-subject'
import { createPositionCommand } from './create-position'
import { createStatementCommand } from './create-statement'
import { organisationAuthor, publicFigureAuthor, StatementAuthor } from '../entities/statement'
import { ContributorIdentity, Rejected } from './types'
import { found } from './preconditions'
import { CommandFailure, FormFailure, runCommand } from './run-command'

type ValidateDraftParams = {
  draftId: string
  contributor: ContributorIdentity
  draftRepo: DraftStatementRepository
  publicFigureRepo: PublicFigureRepository
  organisationRepo: OrganisationRepository
  subjectRepo: SubjectRepository
  positionRepo: PositionRepository
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  publicFigureSource: PublicFigureSource
  argumentRepo: ArgumentRepository
  occupationRepo: OccupationRepository
  membershipRepo: OrganisationMembershipRepository
  wikipediaValidator: WikipediaValidator
}

/** What a command behind a form says, told as one message: the draft has no form to blame a field on */
const toldAsOne = <A>(command: Effect.Effect<A, FormFailure>): Effect.Effect<A, CommandFailure> =>
  Effect.catchTag(command, 'Invalid', (invalid) =>
    Effect.fail(new Rejected(Object.values(invalid.fields).join(' '))),
  )

/** The id of what the site knows under that name, or of what the draft lets the site create */
const knownOrCreated = (
  lookup: Effect.Effect<{ id: string } | null, DatabaseError>,
  create: () => Effect.Effect<{ id: string }, CommandFailure>,
): Effect.Effect<string, CommandFailure> =>
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
export function validateDraft(params: ValidateDraftParams): Promise<Either.Either<void, string>> {
  const { draftId, draftRepo, contributor, runUnitOfWork } = params

  return runCommand(
    pipe(
      Effect.flatMap(draftRepo.findById(draftId), found('Brouillon introuvable.')),
      Effect.bindTo('draft'),
      Effect.bind('author', ({ draft }) => authorOf(draft.author, params)),
      // What the draft says of the person herself, applied before the statement so
      // that a wrong occupation or affiliation stops the draft instead of landing
      // a statement whose author stays half documented.
      Effect.tap(({ draft, author }) =>
        author.kind === 'public_figure'
          ? Effect.andThen(
              occupationsApplied(draft, author.id, params),
              affiliationsApplied(draft, author.id, params),
            )
          : Effect.void,
      ),
      Effect.bind('subjectId', ({ draft }) => subjectOf(draft, params)),
      Effect.bind('positionId', ({ draft, subjectId }) => positionOf(draft, subjectId, params)),
      Effect.flatMap(({ draft, author, subjectId, positionId }) =>
        toldAsOne(
          createStatementCommand({
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
            runUnitOfWork,
            positionRepo: params.positionRepo,
            publicFigureRepo: params.publicFigureRepo,
            organisationRepo: params.organisationRepo,
            argumentRepo: params.argumentRepo,
          }),
        ),
      ),
      Effect.andThen(draftRepo.updateStatus(draftId, 'validated')),
      Effect.asVoid,
    ),
  )
}

function authorOf(
  author: DraftAuthor,
  deps: ValidateDraftParams,
): Effect.Effect<StatementAuthor, CommandFailure> {
  return author.kind === 'public_figure'
    ? Effect.map(
        knownOrCreated(
          deps.publicFigureRepo.findBySlug(generatePublicFigureSlug(author.name)),
          () => createdPublicFigure(author, deps),
        ),
        publicFigureAuthor,
      )
    : Effect.map(
        knownOrCreated(
          deps.organisationRepo.findBySlug(generateOrganisationSlug(author.name)),
          () => createdOrganisation(author.name, author.data, deps),
        ),
        organisationAuthor,
      )
}

function createdPublicFigure(
  author: Extract<DraftAuthor, { kind: 'public_figure' }>,
  deps: ValidateDraftParams,
) {
  return author.data
    ? toldAsOne(
        createPublicFigureCommand({
          contributor: deps.contributor,
          name: author.name,
          presentation: author.data.presentation,
          wikipediaUrl: author.data.wikipediaUrl ?? '',
          websiteUrl: author.data.websiteUrl ?? '',
          notorietySources: author.data.notorietySources ?? [],
          runUnitOfWork: deps.runUnitOfWork,
          publicFigureRepo: deps.publicFigureRepo,
          wikipediaValidator: deps.wikipediaValidator,
        }),
      )
    : missingData(`la personnalité « ${author.name} »`)
}

function createdOrganisation(
  name: string,
  data: DraftOrganisationData | null | undefined,
  deps: ValidateDraftParams,
) {
  return data
    ? toldAsOne(
        createOrganisationCommand({
          contributor: deps.contributor,
          name,
          acronym: data.acronym ?? '',
          organisationType: data.organisationType,
          presentation: data.presentation,
          wikipediaUrl: data.wikipediaUrl ?? '',
          websiteUrl: data.websiteUrl ?? '',
          notorietySources: data.notorietySources ?? [],
          runUnitOfWork: deps.runUnitOfWork,
          organisationRepo: deps.organisationRepo,
          wikipediaValidator: deps.wikipediaValidator,
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
  deps: ValidateDraftParams,
): Effect.Effect<void, CommandFailure> {
  if (draft.occupations.length === 0) return Effect.void

  const drafted = Effect.flatMap(deps.occupationRepo.findAll(), (listed) =>
    Effect.forEach(draft.occupations, (occupation) => {
      const match = listed.find((candidate) => sameOccupationName(occupation.name, candidate.name))
      return match
        ? Effect.succeed({ occupationId: match.id, current: occupation.current })
        : Effect.fail(new Rejected(`Le métier « ${occupation.name} » n’est pas dans la liste.`))
    }),
  )
  const held = Effect.map(deps.occupationRepo.findByPublicFigureId(publicFigureId), (held) =>
    held.map(({ occupation, current }) => ({ occupationId: occupation.id, current })),
  )

  return pipe(
    Effect.all({ drafted, held }),
    Effect.flatMap(({ drafted, held }) =>
      setPublicFigureOccupationsCommand({
        contributor: deps.contributor,
        publicFigureId,
        assignments: [...held, ...drafted],
        occupationRepo: deps.occupationRepo,
        runUnitOfWork: deps.runUnitOfWork,
        publicFigureSource: deps.publicFigureSource,
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
  deps: ValidateDraftParams,
): Effect.Effect<void, CommandFailure> {
  return Effect.forEach(
    draft.affiliations,
    (affiliation) => affiliated(affiliation, publicFigureId, deps),
    { discard: true },
  )
}

function affiliated(
  affiliation: DraftAffiliation,
  publicFigureId: string,
  deps: ValidateDraftParams,
): Effect.Effect<void, CommandFailure> {
  const alreadyRunning = (organisationId: string) =>
    Effect.map(deps.membershipRepo.findByOrganisationId(organisationId), (memberships) =>
      memberships.some(
        ({ membership }) =>
          membership.publicFigureId === publicFigureId && isCurrentMembership(membership),
      ),
    )
  const added = (organisationId: string) =>
    pipe(
      toldAsOne(
        addOrganisationMembershipCommand({
          contributor: deps.contributor,
          organisationId,
          publicFigureId,
          role: affiliation.role ?? '',
          startedOn: affiliation.startedOn ?? '',
          endedOn: affiliation.endedOn ?? '',
          organisationRepo: deps.organisationRepo,
          runUnitOfWork: deps.runUnitOfWork,
          publicFigureSource: deps.publicFigureSource,
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
      deps.organisationRepo.findBySlug(generateOrganisationSlug(affiliation.organisation)),
      () => createdOrganisation(affiliation.organisation, affiliation.organisationData, deps),
    ),
    Effect.flatMap((organisationId) =>
      Effect.flatMap(
        alreadyRunning(organisationId),
        (running): Effect.Effect<void, CommandFailure> =>
          running ? Effect.void : added(organisationId),
      ),
    ),
  )
}

function subjectOf(
  draft: DraftStatement,
  deps: ValidateDraftParams,
): Effect.Effect<string, CommandFailure> {
  return knownOrCreated(deps.subjectRepo.findBySlug(generateSubjectSlug(draft.subjectTitle)), () =>
    draft.subjectData
      ? toldAsOne(
          createSubjectCommand({
            contributor: deps.contributor,
            title: draft.subjectTitle,
            presentation: draft.subjectData.presentation,
            problem: draft.subjectData.problem,
            runUnitOfWork: deps.runUnitOfWork,
            subjectRepo: deps.subjectRepo,
          }),
        )
      : missingData(`le sujet « ${draft.subjectTitle} »`),
  )
}

function positionOf(
  draft: DraftStatement,
  subjectId: string,
  deps: ValidateDraftParams,
): Effect.Effect<string, CommandFailure> {
  return knownOrCreated(
    Effect.map(
      deps.positionRepo.findBySubjectId(subjectId),
      (positions) => positions.find((p) => p.title === draft.positionTitle) ?? null,
    ),
    () =>
      draft.positionData
        ? toldAsOne(
            createPositionCommand({
              contributor: deps.contributor,
              subjectId,
              title: draft.positionTitle,
              description: draft.positionData.description,
              runUnitOfWork: deps.runUnitOfWork,
              subjectSource: deps.subjectSource,
            }),
          )
        : missingData(`la position « ${draft.positionTitle} »`),
  )
}
