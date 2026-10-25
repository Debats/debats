import { Effect, Either, pipe } from 'effect'
import { generateOrganisationSlug, Organisation, OrganisationType } from '../entities/organisation'
import { editOrganisation } from '../aggregates/organisation'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { validateOrganisationFields } from './validate-organisation-fields'
import { ensureStream } from './aggregate-stream'
import { runCommand, uniqueTakenAs } from './run-command'
import {
  decideOnOrganisation,
  organisationAggregate,
  OrganisationSource,
} from './organisation-stream'

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
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
  runUnitOfWork: RunUnitOfWork
  organisationSource: OrganisationSource
  /** Read side: the organisation must exist and the new name must be free */
  organisationRepo: OrganisationRepository
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

/** Records the edit in the journal and rewards the contributor. */
export async function persistUpdatedOrganisation(
  params: UpdateOrganisationParams,
  { existing, organisationType }: ValidatedUpdate,
): Promise<Either.Either<Organisation, string>> {
  const { runUnitOfWork } = params
  const contributor = params.contributor!

  const edited = editOrganisation({
    name: params.name,
    acronym: params.acronym,
    organisationType,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    websiteUrl: params.websiteUrl,
    notorietySources: params.notorietySources,
  })

  const outcome = await runCommand(
    pipe(
      ensureStream(organisationAggregate, runUnitOfWork, existing.id, params.organisationSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            decideOnOrganisation(
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
                rewardFor(contributor.id, 'edited_organisation', {
                  relatedEntityType: 'organisation',
                  relatedEntityId: existing.id,
                }),
              ),
            ),
          ),
        ),
      ),
      uniqueTakenAs('name', 'Une organisation avec ce nom existe déjà.'),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  return Either.right(outcome.right.organisation)
}

/** Validates and updates an organisation in one step. */
export async function updateOrganisationUseCase(
  params: UpdateOrganisationParams,
): Promise<Either.Either<Organisation, string | FieldErrors>> {
  const validation = await validateUpdateOrganisation(params)
  if (Either.isLeft(validation)) {
    return Either.left(validation.left)
  }

  return persistUpdatedOrganisation(params, validation.right)
}
