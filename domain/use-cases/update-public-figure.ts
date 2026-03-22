import { Either } from 'effect'
import { Effect, Option } from 'effect'
import { generateSlug, PublicFigure, PublicFigureName } from '../entities/public-figure'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { validatePublicFigureFields } from './validate-public-figure-fields'

type UpdatePublicFigureParams = {
  contributor: ContributorIdentity | null
  figureId: string
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  publicFigureRepo: PublicFigureRepository
  reputationRepo: ReputationRepository
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
 * Persists the updated public figure and records reputation.
 */
export async function persistUpdatedPublicFigure(
  params: UpdatePublicFigureParams,
  existing: PublicFigure,
): Promise<PublicFigure> {
  const { name, presentation, notorietySources, websiteUrl, publicFigureRepo, reputationRepo } =
    params
  const wikipediaUrl = params.wikipediaUrl.trim()
  const contributor = params.contributor!

  const updated: PublicFigure = {
    ...existing,
    name: PublicFigureName.make(name),
    slug: generateSlug(name),
    presentation,
    wikipediaUrl: wikipediaUrl ? Option.some(wikipediaUrl) : Option.none(),
    notorietySources,
    websiteUrl: websiteUrl ? Option.some(websiteUrl) : Option.none(),
    updatedAt: new Date(),
  }

  const saved = await Effect.runPromise(publicFigureRepo.update(updated))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_personality',
      amount: reputationReward('edited_personality'),
      relatedEntityType: 'public_figure',
      relatedEntityId: saved.id,
    }),
  )

  return saved
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

  const saved = await persistUpdatedPublicFigure(params, validation.right)
  return Either.right(saved)
}
