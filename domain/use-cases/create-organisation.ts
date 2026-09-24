import { Effect, Either } from 'effect'
import {
  createOrganisation,
  generateOrganisationSlug,
  Organisation,
  OrganisationType,
} from '../entities/organisation'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { validateOrganisationFields } from './validate-organisation-fields'

export type CreateOrganisationParams = {
  contributor: ContributorIdentity | null
  name: string
  acronym: string
  organisationType: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  organisationRepo: OrganisationRepository
  reputationRepo: ReputationRepository
  wikipediaValidator: WikipediaValidator
}

export type { FieldErrors }

/**
 * Validates all inputs without persisting anything.
 * Call this before side effects (logo upload) to fail fast.
 */
export async function validateCreateOrganisation(
  params: CreateOrganisationParams,
): Promise<Either.Either<{ organisationType: OrganisationType }, string | FieldErrors>> {
  const { contributor, organisationRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_organisation')) {
    const rank = requiredRank('add_organisation')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle organisation.`)
  }

  const validated = await validateOrganisationFields(params)
  if (Either.isLeft(validated)) {
    return Either.left(validated.left)
  }

  const existing = await Effect.runPromise(
    organisationRepo.findBySlug(generateOrganisationSlug(params.name)),
  )
  if (existing) {
    return Either.left({ name: 'Une organisation avec ce nom existe déjà.' })
  }

  return Either.right(validated.right)
}

/**
 * Persists a validated organisation and records reputation.
 * Call only after validation has passed and any side effects (logo upload) are done.
 */
export async function persistOrganisation(
  params: CreateOrganisationParams,
  organisationType: OrganisationType,
): Promise<Organisation> {
  const contributor = params.contributor!

  const organisation = createOrganisation({
    name: params.name,
    acronym: params.acronym,
    organisationType,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    websiteUrl: params.websiteUrl,
    notorietySources: params.notorietySources,
    createdBy: contributor.id,
  })

  const created = await Effect.runPromise(params.organisationRepo.create(organisation))

  await Effect.runPromise(
    params.reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_organisation_validated',
      amount: reputationReward('added_organisation_validated'),
      relatedEntityType: 'organisation',
      relatedEntityId: created.id,
    }),
  )

  return created
}

/** Validates and creates an organisation in one step. */
export async function createOrganisationUseCase(
  params: CreateOrganisationParams,
): Promise<Either.Either<Organisation, string | FieldErrors>> {
  const validation = await validateCreateOrganisation(params)
  if (Either.isLeft(validation)) {
    return Either.left(validation.left)
  }

  return Either.right(await persistOrganisation(params, validation.right.organisationType))
}
