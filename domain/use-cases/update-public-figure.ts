import { Either, Effect, pipe } from 'effect'
import { generateSlug, PublicFigure } from '../entities/public-figure'
import { editPublicFigure } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { validatePublicFigureFields } from './validate-public-figure-fields'
import { ensureStream } from './aggregate-stream'
import { runCommand, uniqueTakenAs } from './run-command'
import {
  decideOnPublicFigure,
  publicFigureAggregate,
  PublicFigureSource,
} from './public-figure-stream'

type UpdatePublicFigureParams = {
  contributor: ContributorIdentity | null
  figureId: string
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
  runUnitOfWork: RunUnitOfWork
  publicFigureSource: PublicFigureSource
  /** Read side: the figure must exist and the new name must be free */
  publicFigureRepo: PublicFigureRepository
  wikipediaValidator: WikipediaValidator
}

export type { FieldErrors }

/**
 * Validates update inputs without persisting.
 * Call before side effects (photo re-upload) to fail fast.
 */
export async function validateUpdatePublicFigure(
  params: UpdatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  const { contributor, figureId, name, publicFigureRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_personality')) {
    const rank = requiredRank('edit_personality')
    return Either.left(`Vous devez être ${rank} pour modifier une personnalité.`)
  }

  const existing = await Effect.runPromise(publicFigureRepo.findById(figureId))
  if (!existing) {
    return Either.left('Personnalité introuvable.')
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

  const newSlug = generateSlug(name)
  if (newSlug !== existing.slug) {
    const conflicting = await Effect.runPromise(publicFigureRepo.findBySlug(newSlug))
    if (conflicting) {
      return Either.left({ name: 'Une personnalité avec ce nom existe déjà.' })
    }
  }

  return Either.right(existing)
}

/**
 * Records the edit in the journal and rewards the contributor.
 */
export async function persistUpdatedPublicFigure(
  params: UpdatePublicFigureParams,
  existing: PublicFigure,
): Promise<Either.Either<PublicFigure, string>> {
  const { name, presentation, notorietySources, websiteUrl, runUnitOfWork } = params
  const contributor = params.contributor!

  const edited = editPublicFigure({
    name,
    presentation,
    wikipediaUrl: params.wikipediaUrl.trim() || undefined,
    websiteUrl: websiteUrl || undefined,
    notorietySources,
  })

  const outcome = await runCommand(
    pipe(
      ensureStream(publicFigureAggregate, runUnitOfWork, existing.id, params.publicFigureSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            decideOnPublicFigure(
              events,
              existing.id,
              contributor.id,
              () => Effect.succeed([edited]),
              params.revision,
            ),
            Effect.tap(() =>
              grant(
                events,
                contributor.id,
                rewardFor(contributor.id, 'edited_personality', {
                  relatedEntityType: 'public_figure',
                  relatedEntityId: existing.id,
                }),
              ),
            ),
          ),
        ),
      ),
      uniqueTakenAs('name', 'Une personnalité avec ce nom existe déjà.'),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  return Either.right(outcome.right.state.figure)
}

/**
 * Validates and updates a public figure in one step.
 */
export async function updatePublicFigureUseCase(
  params: UpdatePublicFigureParams,
): Promise<Either.Either<PublicFigure, string | FieldErrors>> {
  const validation = await validateUpdatePublicFigure(params)
  if (Either.isLeft(validation)) {
    return Either.left(validation.left)
  }

  return persistUpdatedPublicFigure(params, validation.right)
}
