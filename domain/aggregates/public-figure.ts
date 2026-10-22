import { Either, Option, pipe } from 'effect'
import {
  MembershipId,
  OrganisationMembership,
  isCurrentMembership,
} from '../entities/organisation-membership'
import {
  generateSlug,
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../entities/public-figure'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
import {
  decodePublicFigureEvent,
  MembershipContent,
  OccupationAssignmentPayload,
  PublicFigureContent,
  PublicFigureEvent,
} from './public-figure-events'

export const PUBLIC_FIGURE_STREAM = 'public_figure'

export const publicFigureStream = (id: string): StreamRef => ({
  streamType: PUBLIC_FIGURE_STREAM,
  streamId: id,
})

/** What the journal says a public figure is right now, occupations and affiliations included */
export interface PublicFigureState {
  figure: PublicFigure
  occupations: readonly OccupationAssignmentPayload[]
  memberships: readonly OrganisationMembership[]
  deletedAt: Date | null
}

export interface PublicFigureInput {
  name: string
  presentation: string
  wikipediaUrl?: string
  websiteUrl?: string
  notorietySources: readonly string[]
}

export interface MembershipInput {
  membershipId: string
  organisationId: string
  role?: string
  startedOn?: Date
  endedOn?: Date
}

const isoDate = (date: Date): string => date.toISOString().slice(0, 10)

const content = (input: PublicFigureInput): PublicFigureContent => ({
  name: input.name,
  slug: generateSlug(input.name),
  presentation: input.presentation,
  ...(input.wikipediaUrl ? { wikipediaUrl: input.wikipediaUrl } : {}),
  ...(input.websiteUrl ? { websiteUrl: input.websiteUrl } : {}),
  notorietySources: [...input.notorietySources],
})

/** Decision: a contributor adds a public figure (her id is chosen by the caller, as the stream's) */
export const addPublicFigure = (input: PublicFigureInput): PublicFigureEvent => ({
  type: 'PublicFigureAdded',
  payload: content(input),
})

export const editPublicFigure = (input: PublicFigureInput): PublicFigureEvent => ({
  type: 'PublicFigureEdited',
  payload: content(input),
})

export const setOccupations = (
  occupations: readonly OccupationAssignmentPayload[],
): PublicFigureEvent => ({
  type: 'OccupationsSet',
  payload: { occupations: [...occupations] },
})

const membershipContent = (input: MembershipInput): MembershipContent => ({
  membershipId: input.membershipId,
  organisationId: input.organisationId,
  ...(input.role ? { role: input.role } : {}),
  ...(input.startedOn ? { startedOn: isoDate(input.startedOn) } : {}),
  ...(input.endedOn ? { endedOn: isoDate(input.endedOn) } : {}),
})

export const addMembership = (input: MembershipInput): PublicFigureEvent => ({
  type: 'MembershipAdded',
  payload: membershipContent(input),
})

export const removeMembership = (membershipId: string): PublicFigureEvent => ({
  type: 'MembershipRemoved',
  payload: { membershipId },
})

/** A figure found in the tables before her journal existed enters it as she is */
export const importPublicFigure = (figure: PublicFigure): PublicFigureEvent => ({
  type: 'PublicFigureImported',
  payload: content({
    name: figure.name,
    presentation: figure.presentation,
    wikipediaUrl: Option.getOrUndefined(figure.wikipediaUrl),
    websiteUrl: Option.getOrUndefined(figure.websiteUrl),
    notorietySources: figure.notorietySources,
  }),
})

export const importMembership = (membership: OrganisationMembership): PublicFigureEvent => ({
  type: 'MembershipImported',
  payload: membershipContent({
    membershipId: membership.id,
    organisationId: membership.organisationId,
    role: Option.getOrUndefined(membership.role),
    startedOn: Option.getOrUndefined(membership.startedOn),
    endedOn: Option.getOrUndefined(membership.endedOn),
  }),
})

/** Whether the figure is currently affiliated to this organisation */
export const hasCurrentMembership = (state: PublicFigureState, organisationId: string): boolean =>
  state.memberships.some((m) => m.organisationId === organisationId && isCurrentMembership(m))

export const findMembership = (
  state: PublicFigureState,
  membershipId: string,
): OrganisationMembership | undefined => state.memberships.find((m) => m.id === membershipId)

/** Rebuilds the figure from her stream; null for a stream without events */
export function replayPublicFigure(
  events: StoredEvent[],
): Either.Either<PublicFigureState | null, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        pipe(
          decodePublicFigureEvent(stored),
          Either.flatMap((event) => requireAuthorOfCreation(stored, event)),
          Either.map(withMeta(stored)),
        ),
      ),
    ),
    (decoded) => decoded.reduce(apply, null),
  )
}

const CREATIONS = new Set<PublicFigureEvent['type']>([
  'PublicFigureAdded',
  'PublicFigureImported',
  'MembershipAdded',
  'MembershipImported',
])

/**
 * A public figure and an affiliation always have an author (the columns are
 * not null): a creation without one is corrupt, as the projector will say.
 */
function requireAuthorOfCreation(
  stored: StoredEvent,
  event: PublicFigureEvent,
): Either.Either<PublicFigureEvent, UnreadableEvent> {
  return CREATIONS.has(event.type) && !stored.actorId
    ? Either.left(new UnreadableEvent(stored, 'a public figure or an affiliation needs an author'))
    : Either.right(event)
}

interface DecodedEvent {
  event: PublicFigureEvent
  stored: StoredEvent
}

const withMeta = (stored: StoredEvent) => (event: PublicFigureEvent) => ({ event, stored })

function apply(
  state: PublicFigureState | null,
  { event, stored }: DecodedEvent,
): PublicFigureState | null {
  switch (event.type) {
    case 'PublicFigureAdded':
    case 'PublicFigureImported':
      return {
        figure: figureFrom(stored, event.payload),
        occupations: [],
        memberships: [],
        deletedAt: null,
      }
  }
  if (!state) return null
  switch (event.type) {
    case 'PublicFigureEdited':
      return {
        ...state,
        figure: {
          ...state.figure,
          ...figureFields(event.payload),
          updatedAt: stored.occurredAt,
        },
      }
    case 'OccupationsSet':
      return { ...state, occupations: event.payload.occupations }
    case 'MembershipAdded':
    case 'MembershipImported':
      return {
        ...state,
        memberships: [...state.memberships, membershipFrom(stored, state.figure, event.payload)],
      }
    case 'MembershipRemoved':
      return {
        ...state,
        memberships: state.memberships.filter((m) => m.id !== event.payload.membershipId),
      }
    case 'PublicFigureDeleted':
      return { ...state, deletedAt: stored.occurredAt }
  }
}

function figureFields(payload: PublicFigureContent) {
  return {
    name: PublicFigureName.make(payload.name),
    slug: PublicFigureSlug.make(payload.slug),
    presentation: payload.presentation,
    wikipediaUrl: Option.fromNullable(payload.wikipediaUrl),
    websiteUrl: Option.fromNullable(payload.websiteUrl),
    notorietySources: payload.notorietySources,
  }
}

function figureFrom(stored: StoredEvent, payload: PublicFigureContent): PublicFigure {
  return PublicFigure.make({
    id: PublicFigureId.make(stored.streamId),
    ...figureFields(payload),
    // Checked by requireAuthorOfCreation before any event is applied
    createdBy: stored.actorId!,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}

function membershipFrom(
  stored: StoredEvent,
  figure: PublicFigure,
  payload: MembershipContent,
): OrganisationMembership {
  // Checked by requireAuthorOfCreation before any event is applied
  const actor = stored.actorId!
  return OrganisationMembership.make({
    id: MembershipId.make(payload.membershipId),
    organisationId: payload.organisationId,
    publicFigureId: figure.id,
    role: Option.fromNullable(payload.role),
    startedOn: Option.map(Option.fromNullable(payload.startedOn), (d) => new Date(d)),
    endedOn: Option.map(Option.fromNullable(payload.endedOn), (d) => new Date(d)),
    createdBy: actor,
    updatedBy: actor,
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}
