import { Effect, pipe } from 'effect'
import { generateOrganisationSlug, Organisation, OrganisationType } from '../entities/organisation'
import { editOrganisation } from '../aggregates/organisation'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { organisationFields } from './validate-organisation-fields'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found, free, signedIn } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { decideOnOrganisation, organisationAggregate } from './organisation-stream'

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
}

export type { FieldErrors }

export interface ValidatedUpdate {
  existing: Organisation
  organisationType: OrganisationType
}

const NAME_TAKEN = 'Une organisation avec ce nom existe déjà.'

/** Read side: the organisation must exist and the new name must be free */
const organisations = Effect.serviceFunctions(OrganisationRepository)

/** Who may edit the organisation, which one, with a form that holds up and a new name still free */
const checked = (params: UpdateOrganisationParams) => {
  const nameFree = (existing: Organisation) => {
    const newSlug = generateOrganisationSlug(params.name)
    return newSlug === existing.slug
      ? Effect.void
      : Effect.flatMap(organisations.findBySlug(newSlug), free(NAME_TAKEN, 'name'))
  }
  return pipe(
    allowedTo(params.contributor, 'edit_organisation', 'modifier une organisation'),
    Effect.bindTo('contributor'),
    Effect.bind('existing', () =>
      Effect.flatMap(
        organisations.findById(params.organisationId),
        found(organisationAggregate.notFound),
      ),
    ),
    Effect.bind('organisationType', () =>
      Effect.map(organisationFields(params), (validated) => validated.organisationType),
    ),
    Effect.tap(({ existing }) => nameFree(existing)),
  )
}

/** Records the edit in the organisation's stream and rewards the contributor */
const persisted = (
  params: UpdateOrganisationParams,
  contributor: ContributorIdentity,
  { existing, organisationType }: ValidatedUpdate,
) => {
  const edited = editOrganisation({
    name: params.name,
    acronym: params.acronym,
    organisationType,
    presentation: params.presentation,
    wikipediaUrl: params.wikipediaUrl,
    websiteUrl: params.websiteUrl,
    notorietySources: params.notorietySources,
  })
  return pipe(
    ensureStream(organisationAggregate, existing.id),
    Effect.andThen(
      runUnitOfWork((events) =>
        pipe(
          decideOnOrganisation(events, existing.id, contributor.id, edited, params.revision),
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
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.organisation),
  )
}

/**
 * Validates update inputs without persisting; hands the organisation as it
 * stands and the parsed type. Run before side effects (logo re-upload) to fail fast.
 */
export function validateUpdateOrganisation(params: UpdateOrganisationParams) {
  return Effect.map(
    checked(params),
    ({ existing, organisationType }): ValidatedUpdate => ({ existing, organisationType }),
  )
}

/** Records the edit in the journal and rewards the contributor. */
export function persistUpdatedOrganisation(
  params: UpdateOrganisationParams,
  validated: ValidatedUpdate,
) {
  return Effect.flatMap(signedIn(params.contributor), (contributor) =>
    persisted(params, contributor, validated),
  )
}

/** Validates and updates an organisation in one step. */
export function updateOrganisationUseCase(params: UpdateOrganisationParams) {
  return Effect.flatMap(checked(params), ({ contributor, existing, organisationType }) =>
    persisted(params, contributor, { existing, organisationType }),
  )
}
