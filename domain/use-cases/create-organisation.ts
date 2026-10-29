import { Effect, pipe } from 'effect'
import {
  generateOrganisationSlug,
  OrganisationId,
  OrganisationType,
} from '../entities/organisation'
import { addOrganisation } from '../aggregates/organisation'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { organisationFields } from './validate-organisation-fields'
import { openStream } from './aggregate-stream'
import { allowedTo, free, signedIn } from './preconditions'
import { uniqueTakenAs } from './run-command'
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
}

export type { FieldErrors }

const NAME_TAKEN = 'Une organisation avec ce nom existe déjà.'

/** Read side: the name must be free */
const organisations = Effect.serviceFunctions(OrganisationRepository)

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
        organisations.findBySlug(generateOrganisationSlug(params.name)),
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
    runUnitOfWork((events) =>
      pipe(
        openStream(organisationAggregate, events, id, added, contributor.id),
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
 * Run this before side effects (logo upload) to fail fast.
 */
export function validateCreateOrganisation(params: CreateOrganisationParams) {
  return Effect.map(checked(params), ({ validated }) => validated)
}

/**
 * Records a validated organisation in the journal and rewards the contributor.
 * Run only after validation has passed and any side effects (logo upload) are done.
 */
export function persistOrganisation(
  params: CreateOrganisationParams,
  organisationType: OrganisationType,
) {
  return Effect.flatMap(signedIn(params.contributor), (contributor) =>
    persisted(params, contributor, organisationType),
  )
}

/** Validates and creates an organisation in one step. */
export function createOrganisationUseCase(params: CreateOrganisationParams) {
  return Effect.flatMap(checked(params), ({ contributor, validated }) =>
    persisted(params, contributor, validated.organisationType),
  )
}
