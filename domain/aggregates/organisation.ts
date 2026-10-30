import { Option } from 'effect'
import {
  generateOrganisationSlug,
  Organisation,
  OrganisationId,
  OrganisationName,
  OrganisationSlug,
  OrganisationType,
} from '../entities/organisation'
import { StoredEvent, StreamRef } from '../events/event-store'
import {
  decodeOrganisationEvent,
  OrganisationContent,
  OrganisationEvent,
} from './organisation-events'
import { always, Decision } from './decision'
import { authored, authorOf, Decoded, replayStream } from './replay'

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

/* Facts: what the stream records, named in the past tense as the events they are */

export const organisationAdded = (input: OrganisationInput): OrganisationEvent => ({
  type: 'OrganisationAdded',
  payload: content(input),
})

export const organisationEdited = (input: OrganisationInput): OrganisationEvent => ({
  type: 'OrganisationEdited',
  payload: content(input),
})

/* Decisions: what a command asks of the organisation, decided from its state */

export type OrganisationDecision = Decision<OrganisationState, OrganisationEvent>

/** A contributor adds an organisation; its id is the stream's, chosen by the command */
export const addOrganisation = (input: OrganisationInput): OrganisationEvent[] => [
  organisationAdded(input),
]

export const editOrganisation = (input: OrganisationInput): OrganisationDecision =>
  always(organisationEdited(input))

/**
 * Rebuilds the organisation from its stream; null for a stream without events.
 * An organisation always has an author (the column is not null).
 */
export const replayOrganisation = replayStream(
  decodeOrganisationEvent,
  apply,
  authored(['OrganisationAdded'], 'an organisation'),
)

function apply(
  state: OrganisationState | null,
  { event, stored }: Decoded<OrganisationEvent>,
): OrganisationState | null {
  switch (event.type) {
    case 'OrganisationAdded':
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
    createdBy: authorOf(stored),
    updatedBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
