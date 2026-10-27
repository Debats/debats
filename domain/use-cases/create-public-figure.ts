import { Either, Effect, pipe } from 'effect'
import { generateSlug, PublicFigure, PublicFigureId } from '../entities/public-figure'
import { addPublicFigure } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { publicFigureFields } from './validate-public-figure-fields'
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
    allowedTo(params.contributor, 'add_personality', 'proposer une nouvelle personnalité'),
    Effect.tap(() => publicFigureFields(params)),
    Effect.tap(() =>
      Effect.flatMap(
        params.publicFigureRepo.findBySlug(generateSlug(params.name)),
        free(NAME_TAKEN, 'name'),
      ),
    ),
  )

/** Opens the figure's stream and rewards the contributor; the command names the figure */
const persisted = (params: CreatePublicFigureParams, contributor: ContributorIdentity) => {
  const id = PublicFigureId.make(crypto.randomUUID())
  const added = addPublicFigure({
    name: params.name,
    presentation: params.presentation,
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
 * Validates all inputs without persisting anything.
 * Call this before side effects (photo upload) to fail fast.
 */
export function validateCreatePublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<void, string | FieldErrors>> {
  return runFormCommand(Effect.asVoid(checked(params)))
}

/**
 * Records a validated public figure in the journal and rewards the contributor.
 * Call only after validation has passed and any side effects (photo upload) are done.
 */
export function persistPublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string>> {
  return runCommand(
    Effect.flatMap(signedIn(params.contributor), (contributor) => persisted(params, contributor)),
  )
}

/**
 * Validates and creates a public figure in one step.
 * Use this when there are no side effects between validation and creation.
 */
export function createPublicFigureUseCase(
  params: CreatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  return runFormCommand(
    Effect.flatMap(checked(params), (contributor) => persisted(params, contributor)),
  )
}
