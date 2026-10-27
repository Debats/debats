import { Either, Effect, pipe } from 'effect'
import { generateSlug, PublicFigure, PublicFigureId } from '../entities/public-figure'
import { addPublicFigure } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { validatePublicFigureFields } from './validate-public-figure-fields'
import { openStream } from './aggregate-stream'
import { runCommand, uniqueTakenAs } from './run-command'
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

/**
 * Validates all inputs without persisting anything.
 * Call this before side effects (photo upload) to fail fast.
 */
export async function validateCreatePublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<void, string | FieldErrors>> {
  const { contributor, name, publicFigureRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_personality')) {
    const rank = requiredRank('add_personality')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle personnalité.`)
  }

  const fieldErrors = await validatePublicFigureFields({
    name,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    notorietySources: params.notorietySources,
    wikipediaValidator: params.wikipediaValidator,
  })

  if (fieldErrors) {
    return Either.left(fieldErrors)
  }

  const existingBySlug = await Effect.runPromise(publicFigureRepo.findBySlug(generateSlug(name)))
  if (existingBySlug) {
    return Either.left({ name: 'Une personnalité avec ce nom existe déjà.' })
  }

  return Either.right(undefined)
}

/**
 * Records a validated public figure in the journal and rewards the contributor.
 * Call only after validation has passed and any side effects (photo upload) are done.
 */
export async function persistPublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string>> {
  const { name, presentation, notorietySources, websiteUrl, runUnitOfWork } = params
  const contributor = params.contributor!

  // The command names the figure: the stream exists from its first event
  const id = PublicFigureId.make(crypto.randomUUID())
  const added = addPublicFigure({
    name,
    presentation,
    wikipediaUrl: params.wikipediaUrl.trim() || undefined,
    websiteUrl: websiteUrl || undefined,
    notorietySources,
  })

  const outcome = await runCommand(
    pipe(
      runUnitOfWork((events) =>
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
      uniqueTakenAs('name', 'Une personnalité avec ce nom existe déjà.'),
    ),
  )

  return Either.map(outcome, ({ state }) => state.figure)
}

/**
 * Validates and creates a public figure in one step.
 * Use this when there are no side effects between validation and creation.
 */
export async function createPublicFigureUseCase(
  params: CreatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  const validation = await validateCreatePublicFigure(params)
  if (Either.isLeft(validation)) {
    return Either.left(validation.left)
  }

  return persistPublicFigure(params)
}
