import { Either, Option, pipe } from 'effect'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationId,
  OrganisationName,
  OrganisationSlug,
  OrganisationType,
} from '../entities/organisation'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
import {
  decodeOrganisationEvent,
  OrganisationContent,
  OrganisationEvent,
} from './organisation-events'

export const ORGANISATION_STREAM = 'organisation'

export const organisationStream = (id: string): StreamRef => ({
  streamType: ORGANISATION_STREAM,
  streamId: id,
})

/** What the journal says an organisation is right now */
export interface OrganisationState {
  organisation: Organisation
  deletedAt: Date | null
}

export interface OrganisationInput {
  name: string
  acronym?: string
  organisationType: OrganisationType
  presentation: string
  wikipediaUrl?: string
  websiteUrl?: string
  notorietySources: readonly string[]
}

const blankToUndefined = (value: string | undefined): string | undefined =>
  value?.trim() ? value.trim() : undefined

const content = (input: OrganisationInput): OrganisationContent => {
  const acronym = blankToUndefined(input.acronym)
  const wikipediaUrl = blankToUndefined(input.wikipediaUrl)
  const websiteUrl = blankToUndefined(input.websiteUrl)
  return {
    name: input.name,
    slug: generateOrganisationSlug(input.name),
    ...(acronym ? { acronym } : {}),
    organisationType: input.organisationType,
    presentation: input.presentation,
    ...(wikipediaUrl ? { wikipediaUrl } : {}),
    ...(websiteUrl ? { websiteUrl } : {}),
    notorietySources: [...input.notorietySources],
  }
}

/** Decision: a contributor adds an organisation (its id is chosen by the caller, as the stream's) */
export const addOrganisation = (input: OrganisationInput): OrganisationEvent => ({
  type: 'OrganisationAdded',
  payload: content(input),
})

export const editOrganisation = (input: OrganisationInput): OrganisationEvent => ({
  type: 'OrganisationEdited',
  payload: content(input),
})

/** An organisation found in the tables before its journal existed enters it as it is */
export const importOrganisation = (organisation: Organisation): OrganisationEvent => ({
  type: 'OrganisationImported',
  payload: content({
    name: organisation.name,
    acronym: Option.getOrUndefined(organisation.acronym),
    organisationType: organisation.organisationType,
    presentation: organisation.presentation,
    wikipediaUrl: Option.getOrUndefined(organisation.wikipediaUrl),
    websiteUrl: Option.getOrUndefined(organisation.websiteUrl),
    notorietySources: organisation.notorietySources,
  }),
})

/** Rebuilds the organisation from its stream; null for a stream without events */
export function replayOrganisation(
  events: StoredEvent[],
): Either.Either<OrganisationState | null, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        pipe(
          decodeOrganisationEvent(stored),
          Either.flatMap((event) => requireAuthorOfCreation(stored, event)),
          Either.map(withMeta(stored)),
        ),
      ),
    ),
    (decoded) => decoded.reduce(apply, null),
  )
}

/** An organisation always has an author (the column is not null): a creation without one is corrupt */
function requireAuthorOfCreation(
  stored: StoredEvent,
  event: OrganisationEvent,
): Either.Either<OrganisationEvent, UnreadableEvent> {
  const creation = event.type === 'OrganisationAdded' || event.type === 'OrganisationImported'
  return creation && !stored.actorId
    ? Either.left(new UnreadableEvent(stored, 'an organisation needs an author'))
    : Either.right(event)
}

interface DecodedEvent {
  event: OrganisationEvent
  stored: StoredEvent
}

const withMeta = (stored: StoredEvent) => (event: OrganisationEvent) => ({ event, stored })

function apply(
  state: OrganisationState | null,
  { event, stored }: DecodedEvent,
): OrganisationState | null {
  switch (event.type) {
    case 'OrganisationAdded':
    case 'OrganisationImported':
      return { organisation: organisationFrom(stored, event.payload), deletedAt: null }
  }
  if (!state) return null
  switch (event.type) {
    case 'OrganisationEdited':
      return {
        ...state,
        organisation: {
          ...state.organisation,
          ...organisationFields(event.payload),
          updatedBy: stored.actorId ?? state.organisation.updatedBy,
          updatedAt: stored.occurredAt,
        },
      }
    case 'OrganisationDeleted':
      return { ...state, deletedAt: stored.occurredAt }
  }
}

function organisationFields(payload: OrganisationContent) {
  return {
    name: OrganisationName.make(payload.name),
    slug: OrganisationSlug.make(payload.slug),
    acronym: Option.fromNullable(payload.acronym),
    organisationType: payload.organisationType,
    presentation: payload.presentation,
    wikipediaUrl: Option.fromNullable(payload.wikipediaUrl),
    websiteUrl: Option.fromNullable(payload.websiteUrl),
    notorietySources: payload.notorietySources,
  }
}

function organisationFrom(stored: StoredEvent, payload: OrganisationContent): Organisation {
  return Organisation.make({
    id: OrganisationId.make(stored.streamId),
    ...organisationFields(payload),
    // Checked by requireAuthorOfCreation before any event is applied
    createdBy: stored.actorId!,
    updatedBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
