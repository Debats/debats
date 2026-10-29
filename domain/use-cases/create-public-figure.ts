import { Either, Effect, pipe } from 'effect'
import { generateSlug, PublicFigure, PublicFigureId } from '../entities/public-figure'
import { addPublicFigure } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { publicFigureFields, ValidatedPublicFigureFields } from './validate-public-figure-fields'
import { openStream } from './aggregate-stream'
import { allowedTo, free, signedIn } from './preconditions'
import { runCommand, runFormCommand, uniqueTakenAs } from './run-command'
import { publicFigureAggregate } from './public-figure-stream'

type CreatePublicFigureParams = {
  contributor: ContributorIdentity | null
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  runUnitOfWork: RunUnitOfWork
  /** Read side: the name must be free */
  publicFigureRepo: PublicFigureRepository
  wikipediaValidator: WikipediaValidator
}

export type { FieldErrors }

const NAME_TAKEN = 'Une personnalité avec ce nom existe déjà.'

/** Who may propose the figure, with a form that holds up and a name still free */
const checked = (params: CreatePublicFigureParams) =>
  pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'add_personality',
        'proposer une nouvelle personnalité',
      ),
      fields: publicFigureFields(params),
    }),
    Effect.tap(({ fields }) =>
      Effect.flatMap(
        params.publicFigureRepo.findBySlug(generateSlug(fields.name)),
        free(NAME_TAKEN, 'name'),
      ),
    ),
  )

/** Opens the figure's stream and rewards the contributor; the command names the figure */
const persisted = (
  params: CreatePublicFigureParams,
  contributor: ContributorIdentity,
  fields: ValidatedPublicFigureFields,
) => {
  const id = PublicFigureId.make(crypto.randomUUID())
  const added = addPublicFigure({
    ...fields,
    wikipediaUrl: params.wikipediaUrl.trim() || undefined,
    websiteUrl: params.websiteUrl || undefined,
    notorietySources: params.notorietySources,
  })
  return pipe(
    params.runUnitOfWork((events) =>
      pipe(
        openStream(publicFigureAggregate, events, id, [added], contributor.id),
        Effect.tap(() =>
          grant(
            events,
            contributor.id,
            rewardFor(contributor.id, 'added_personality_validated', {
              relatedEntityType: 'public_figure',
              relatedEntityId: id,
            }),
          ),
        ),
      ),
    ),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.figure),
  )
}

/**
 * Validates all inputs without persisting anything; hands the fields as decoded.
 * Call this before side effects (photo upload) to fail fast.
 */
export function validateCreatePublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<ValidatedPublicFigureFields, string | FieldErrors>> {
  return runFormCommand(Effect.map(checked(params), ({ fields }) => fields))
}

/**
 * Records a validated public figure in the journal and rewards the contributor.
 * Call only after validation has passed and any side effects (photo upload) are done.
 */
export function persistPublicFigure(
  params: CreatePublicFigureParams,
  fields: ValidatedPublicFigureFields,
): Promise<Either.Either<PublicFigure, string>> {
  return runCommand(
    Effect.flatMap(signedIn(params.contributor), (contributor) =>
      persisted(params, contributor, fields),
    ),
  )
}

/**
 * Validates and creates a public figure in one step.
 * Use this when there are no side effects between validation and creation.
 */
export function createPublicFigureUseCase(
  params: CreatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  return runFormCommand(createPublicFigureCommand(params))
}

/** The one-step command itself, for a process that runs it among others */
export function createPublicFigureCommand(params: CreatePublicFigureParams) {
  return Effect.flatMap(checked(params), ({ contributor, fields }) =>
    persisted(params, contributor, fields),
  )
}
