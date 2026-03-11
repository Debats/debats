import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createPublicFigure, generateSlug, PublicFigure } from '../entities/public-figure'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'

const CreatePublicFigureInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
})

type CreatePublicFigureParams = {
  contributor: ContributorIdentity | null
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
 * Validates all inputs without persisting anything.
 * Call this before side effects (photo upload) to fail fast.
 */
export async function validateCreatePublicFigure(
  params: CreatePublicFigureParams,
): Promise<Either.Either<void, string | FieldErrors>> {
  const { contributor, name, notorietySources, publicFigureRepo, wikipediaValidator } = params
  const wikipediaUrl = params.wikipediaUrl.trim()

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_personality')) {
    const rank = requiredRank('add_personality')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle personnalité.`)
  }

  const decoded = S.decodeUnknownEither(CreatePublicFigureInput, { errors: 'all' })({
    name,
    presentation: params.presentation,
  })

  const fieldErrors: FieldErrors = {}

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'name') {
        fieldErrors.name = 'Le nom doit faire entre 2 et 100 caractères.'
      } else if (field === 'presentation') {
        fieldErrors.presentation = 'La présentation doit faire au moins 10 caractères.'
      }
    }
  }

  if (wikipediaUrl) {
    if (!/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/.test(wikipediaUrl)) {
      fieldErrors.wikipediaUrl =
        'L\u2019URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
    }
  } else {
    const urlPattern = /^https?:\/\/.+/
    if (notorietySources.length < 2) {
      fieldErrors.notorietySources =
        'Sans page Wikipedia, au moins 2 sources de notoriété sont requises.'
    } else if (!notorietySources.every((url) => urlPattern.test(url))) {
      fieldErrors.notorietySources =
        'Les sources de notoriété doivent être des URLs valides (https://...).'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Either.left(fieldErrors)
  }

  const existingBySlug = await Effect.runPromise(publicFigureRepo.findBySlug(generateSlug(name)))
  if (existingBySlug) {
    return Either.left({ name: 'Une personnalité avec ce nom existe déjà.' })
  }

  if (wikipediaUrl) {
    try {
      const wikiResult = await wikipediaValidator.validatePage(wikipediaUrl)
      if (!wikiResult.exists) {
        return Either.left({
          wikipediaUrl: 'La page Wikipedia n\u2019existe pas.',
        })
      }
      if (!wikiResult.isBiography) {
        return Either.left({
          wikipediaUrl: 'La page Wikipedia ne correspond pas à une biographie.',
        })
      }
    } catch {
      // Mode gracieux : si le validateur échoue (timeout, erreur réseau),
      // on accepte l'URL quand même. Seuls les refus explicites bloquent.
    }
  }

  return Either.right(undefined)
}

/**
 * Persists a validated public figure and records reputation.
 * Call only after validation has passed and any side effects (photo upload) are done.
 */
export async function persistPublicFigure(params: CreatePublicFigureParams): Promise<PublicFigure> {
  const { name, presentation, notorietySources, websiteUrl, publicFigureRepo, reputationRepo } =
    params
  const wikipediaUrl = params.wikipediaUrl.trim()
  const contributor = params.contributor!

  const publicFigure = createPublicFigure({
    name,
    presentation,
    wikipediaUrl: wikipediaUrl || undefined,
    notorietySources,
    websiteUrl: websiteUrl || undefined,
    createdBy: contributor.id,
  })

  const createdFigure = await Effect.runPromise(publicFigureRepo.create(publicFigure))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_personality_validated',
      amount: reputationReward('added_personality_validated'),
      relatedEntityType: 'public_figure',
      relatedEntityId: createdFigure.id,
    }),
  )

  return createdFigure
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
