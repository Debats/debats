import { Effect, pipe } from 'effect'
import {
  generateOrganisationSlug,
  OrganisationId,
  OrganisationType,
} from '../entities/organisation'
import { addOrganisation } from '../aggregates/organisation'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, Grant, rewardFor } from './reward'
import { organisationFields } from './validate-organisation-fields'
import { openStream } from './aggregate-stream'
import { allowedTo, faultsUnder, free, signedIn } from './preconditions'
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

/**
 * What a form sends to open an organisation: the command's own input, minus
 * who is contributing. The all-in-one contribution form passes this as a typed
 * object; the dedicated page still sends a FormData, because it carries a logo.
 */
export type NewOrganisation = Omit<CreateOrganisationParams, 'contributor'>

export type { FieldErrors }

/** The name is unique across the site: the projection refuses it, the command says so */
export const ORGANISATION_NAME_TAKEN = 'Une organisation avec ce nom existe déjà.'

/** Read side: the name must be free */
const organisations = Effect.serviceFunctions(OrganisationRepository)

/** No organisation of that name yet: the slug is what would collide */
const nameFree = (name: string) =>
  Effect.flatMap(
    organisations.findBySlug(generateOrganisationSlug(name)),
    free(ORGANISATION_NAME_TAKEN, 'name'),
  )

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
    Effect.tap(() => nameFree(params.name)),
  )

/**
 * The form of an organisation opened from the all-in-one contribution form,
 * judged whole before anything is written: the right to propose one, the
 * fields, its type, the notoriety criterion, the Wikipedia page, and a name
 * still free.
 *
 * The faults come back under the names that form gives its inputs, except
 * `organisationType`, which already says which entity it belongs to. The
 * Wikipedia lookup is a network call, which is why it belongs here — before
 * the transaction — and never inside it.
 */
export const inlineOrganisationChecked = (
  params: NewOrganisation,
  contributor: ContributorIdentity | null,
) =>
  faultsUnder('organisation', ['organisationType'])(
    pipe(
      allowedTo(contributor, 'add_organisation', 'proposer une nouvelle organisation'),
      Effect.andThen(organisationFields(params)),
      Effect.tap(() => nameFree(params.name)),
    ),
  )

/**
 * Opens the organisation's stream inside the transaction it is given. The
 * command that proposes an organisation alone and the one that proposes it
 * with its first statement both come through here, so one place knows how an
 * organisation comes into being.
 *
 * The reward is left to the caller, who may have others to grant in the same
 * breath: a contributor's gains go to her stream in a single append.
 */
export const recordNewOrganisation = (
  events: EventStore,
  contributorId: string,
  params: NewOrganisation,
  organisationType: OrganisationType,
) => {
  // The command names the organisation: the stream exists from its first event
  const id = OrganisationId.make(crypto.randomUUID())
  return pipe(
    openStream(
      organisationAggregate,
      events,
      id,
      addOrganisation({
        name: params.name,
        acronym: params.acronym,
        organisationType,
        presentation: params.presentation,
        wikipediaUrl: params.wikipediaUrl,
        websiteUrl: params.websiteUrl,
        notorietySources: params.notorietySources,
      }),
      contributorId,
    ),
    Effect.map(({ state }) => state.organisation),
  )
}

/** What proposing an organisation earns, for the caller to grant alongside its others */
export const organisationReward = (contributorId: string, organisationId: string): Grant =>
  rewardFor(contributorId, 'added_organisation_validated', {
    relatedEntityType: 'organisation',
    relatedEntityId: organisationId,
  })

/** The organisation's own transaction, for the command that proposes it alone */
const persisted = (
  params: CreateOrganisationParams,
  contributor: ContributorIdentity,
  organisationType: OrganisationType,
) =>
  pipe(
    runUnitOfWork((events) =>
      pipe(
        recordNewOrganisation(events, contributor.id, params, organisationType),
        Effect.tap((organisation) =>
          grant(events, contributor.id, organisationReward(contributor.id, organisation.id)),
        ),
      ),
    ),
    uniqueTakenAs('name', ORGANISATION_NAME_TAKEN),
  )

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
