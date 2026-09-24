import { Effect, Either } from 'effect'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationType,
  updateOrganisation,
} from '../entities/organisation'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { validateOrganisationFields } from './validate-organisation-fields'

export type UpdateOrganisationParams = {
  contributor: ContributorIdentity | null
  organisationId: string
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

export interface ValidatedUpdate {
  existing: Organisation
  organisationType: OrganisationType
}

/**
 * Validates update inputs without persisting.
 * Call before side effects (logo re-upload) to fail fast.
 */
export async function validateUpdateOrganisation(
  params: UpdateOrganisationParams,
): Promise<Either.Either<ValidatedUpdate, string | FieldErrors>> {
  const { contributor, organisationId, organisationRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_organisation')) {
    const rank = requiredRank('edit_organisation')
    return Either.left(`Vous devez être ${rank} pour modifier une organisation.`)
  }

  const existing = await Effect.runPromise(organisationRepo.findById(organisationId))
  if (!existing) {
    return Either.left('Organisation introuvable.')
  }

  const validated = await validateOrganisationFields(params)
  if (Either.isLeft(validated)) {
    return Either.left(validated.left)
  }

  const newSlug = generateOrganisationSlug(params.name)
  if (newSlug !== existing.slug) {
    const conflicting = await Effect.runPromise(organisationRepo.findBySlug(newSlug))
    if (conflicting) {
      return Either.left({ name: 'Une organisation avec ce nom existe déjà.' })
    }
  }

  return Either.right({ existing, organisationType: validated.right.organisationType })
}

/** Persists the updated organisation and records reputation. */
export async function persistUpdatedOrganisation(
  params: UpdateOrganisationParams,
  { existing, organisationType }: ValidatedUpdate,
): Promise<Organisation> {
  const contributor = params.contributor!

  const updated = updateOrganisation(existing, {
    name: params.name,
    acronym: params.acronym,
    organisationType,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    websiteUrl: params.websiteUrl,
    notorietySources: params.notorietySources,
    updatedBy: contributor.id,
  })

  const saved = await Effect.runPromise(params.organisationRepo.update(updated))

  await Effect.runPromise(
    params.reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_organisation',
      amount: reputationReward('edited_organisation'),
      relatedEntityType: 'organisation',
      relatedEntityId: saved.id,
    }),
  )

  return saved
}

/** Validates and updates an organisation in one step. */
export async function updateOrganisationUseCase(
  params: UpdateOrganisationParams,
): Promise<Either.Either<Organisation, string | FieldErrors>> {
  const validation = await validateUpdateOrganisation(params)
  if (Either.isLeft(validation)) {
    return Either.left(validation.left)
  }

  return Either.right(await persistUpdatedOrganisation(params, validation.right))
}
