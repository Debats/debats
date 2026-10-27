import { Effect, Either, pipe } from 'effect'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationId,
  OrganisationType,
} from '../entities/organisation'
import { addOrganisation } from '../aggregates/organisation'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { organisationFields } from './validate-organisation-fields'
import { openStream } from './aggregate-stream'
import { allowedTo, free, signedIn } from './preconditions'
import { runCommand, runFormCommand, uniqueTakenAs } from './run-command'
import { organisationAggregate } from './organisation-stream'

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
  wikipediaValidator: WikipediaValidator
}

export type { FieldErrors }

const NAME_TAKEN = 'Une organisation avec ce nom existe déjà.'

/** Who may propose the organisation, with a form that holds up and a name still free */
const checked = (params: CreateOrganisationParams) =>
  pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'add_organisation',
        'proposer une nouvelle organisation',
      ),
      validated: organisationFields(params),
    }),
    Effect.tap(() =>
      Effect.flatMap(
        params.organisationRepo.findBySlug(generateOrganisationSlug(params.name)),
        free(NAME_TAKEN, 'name'),
      ),
    ),
  )

/** Opens the organisation's stream and rewards the contributor; the command names it */
const persisted = (
  params: CreateOrganisationParams,
  contributor: ContributorIdentity,
  organisationType: OrganisationType,
) => {
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
  return pipe(
    params.runUnitOfWork((events) =>
      pipe(
        openStream(organisationAggregate, events, id, [added], contributor.id),
        Effect.tap(() =>
          grant(
            events,
            contributor.id,
            rewardFor(contributor.id, 'added_organisation_validated', {
              relatedEntityType: 'organisation',
              relatedEntityId: id,
            }),
          ),
        ),
      ),
    ),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.organisation),
  )
}

/**
 * Validates all inputs without persisting anything; hands the parsed type.
 * Call this before side effects (logo upload) to fail fast.
 */
export function validateCreateOrganisation(
  params: CreateOrganisationParams,
): Promise<Either.Either<{ organisationType: OrganisationType }, string | FieldErrors>> {
  return runFormCommand(Effect.map(checked(params), ({ validated }) => validated))
}

/**
 * Records a validated organisation in the journal and rewards the contributor.
 * Call only after validation has passed and any side effects (logo upload) are done.
 */
export function persistOrganisation(
  params: CreateOrganisationParams,
  organisationType: OrganisationType,
): Promise<Either.Either<Organisation, string>> {
  return runCommand(
    Effect.flatMap(signedIn(params.contributor), (contributor) =>
      persisted(params, contributor, organisationType),
    ),
  )
}

/** Validates and creates an organisation in one step. */
export function createOrganisationUseCase(
  params: CreateOrganisationParams,
): Promise<Either.Either<Organisation, string | FieldErrors>> {
  return runFormCommand(
    Effect.flatMap(checked(params), ({ contributor, validated }) =>
      persisted(params, contributor, validated.organisationType),
    ),
  )
}
