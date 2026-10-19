import { Effect, Either, pipe } from 'effect'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationId,
  OrganisationType,
} from '../entities/organisation'
import { addOrganisation, organisationStream, replayOrganisation } from '../aggregates/organisation'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { validateOrganisationFields } from './validate-organisation-fields'
import { requireOrganisationState } from './organisation-stream'

export type CreateOrganisationParams = {
  contributor: ContributorIdentity | null
  name: string
  acronym: string
  organisationType: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  runUnitOfWork: RunUnitOfWork
  /** Read side: the name must be free */
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
 * Records a validated organisation in the journal and rewards the contributor.
 * Call only after validation has passed and any side effects (logo upload) are done.
 */
export async function persistOrganisation(
  params: CreateOrganisationParams,
  organisationType: OrganisationType,
): Promise<Organisation> {
  const { runUnitOfWork, reputationRepo } = params
  const contributor = params.contributor!

  // The command names the organisation: the stream exists from its first event
  const id = OrganisationId.make(crypto.randomUUID())
  const added = addOrganisation({
    name: params.name,
    acronym: params.acronym,
    organisationType,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    websiteUrl: params.websiteUrl,
    notorietySources: params.notorietySources,
  })

  const state = await Effect.runPromise(
    runUnitOfWork((events) =>
      pipe(
        events.append(organisationStream(id), 0, [added], { actorId: contributor.id }),
        Effect.flatMap(replayOrganisation),
        Effect.flatMap(requireOrganisationState),
      ),
    ),
  )

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_organisation_validated',
      amount: reputationReward('added_organisation_validated'),
      relatedEntityType: 'organisation',
      relatedEntityId: state.organisation.id,
    }),
  )

  return state.organisation
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
