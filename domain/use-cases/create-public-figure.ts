import { Either, Effect, pipe } from 'effect'
import { generateSlug, PublicFigure, PublicFigureId } from '../entities/public-figure'
import {
  addPublicFigure,
  publicFigureStream,
  replayPublicFigure,
} from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { validatePublicFigureFields } from './validate-public-figure-fields'
import { requirePublicFigureState } from './public-figure-stream'

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
  reputationRepo: ReputationRepository
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
export async function persistPublicFigure(params: CreatePublicFigureParams): Promise<PublicFigure> {
  const { name, presentation, notorietySources, websiteUrl, runUnitOfWork, reputationRepo } = params
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

  const state = await Effect.runPromise(
    runUnitOfWork((events) =>
      pipe(
        events.append(publicFigureStream(id), 0, [added], { actorId: contributor.id }),
        Effect.flatMap(replayPublicFigure),
        Effect.flatMap(requirePublicFigureState),
      ),
    ),
  )

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_personality_validated',
      amount: reputationReward('added_personality_validated'),
      relatedEntityType: 'public_figure',
      relatedEntityId: state.figure.id,
    }),
  )

  return state.figure
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

  const createdFigure = await persistPublicFigure(params)
  return Either.right(createdFigure)
}
