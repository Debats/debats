import { Either, Option } from 'effect'
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
import { StoredEvent, StreamRef } from '../events/event-store'
import {
  decodePublicFigureEvent,
  MembershipContent,
  OccupationAssignmentPayload,
  PublicFigureContent,
  PublicFigureEvent,
} from './public-figure-events'
import { always, Decision, refused } from './decision'
import { isoDate } from './iso-date'
import { authored, authorOf, Decoded, replayStream } from './replay'

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

const content = (input: PublicFigureInput): PublicFigureContent => ({
  name: input.name,
  slug: generateSlug(input.name),
  presentation: input.presentation,
  ...(input.wikipediaUrl ? { wikipediaUrl: input.wikipediaUrl } : {}),
  ...(input.websiteUrl ? { websiteUrl: input.websiteUrl } : {}),
  notorietySources: [...input.notorietySources],
})

/* Facts: what the stream records, named in the past tense as the events they are */

export const publicFigureAdded = (input: PublicFigureInput): PublicFigureEvent => ({
  type: 'PublicFigureAdded',
  payload: content(input),
})

export const publicFigureEdited = (input: PublicFigureInput): PublicFigureEvent => ({
  type: 'PublicFigureEdited',
  payload: content(input),
})

export const occupationsSet = (
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

export const membershipAdded = (input: MembershipInput): PublicFigureEvent => ({
  type: 'MembershipAdded',
  payload: membershipContent(input),
})

export const membershipRemoved = (membershipId: string): PublicFigureEvent => ({
  type: 'MembershipRemoved',
  payload: { membershipId },
})

/* Decisions: what a command asks of the figure, decided from her state */

export type PublicFigureDecision = Decision<PublicFigureState, PublicFigureEvent>

export const ALREADY_MEMBER = 'Cette personnalité est déjà membre de cette organisation.'
export const MEMBERSHIP_NOT_FOUND = 'Affiliation introuvable.'

/** A contributor adds a public figure; her id is the stream's, chosen by the command */
export const addPublicFigure = (input: PublicFigureInput): PublicFigureEvent[] => [
  publicFigureAdded(input),
]

export const editPublicFigure = (input: PublicFigureInput): PublicFigureDecision =>
  always(publicFigureEdited(input))

/** The whole set of occupations, current or former, replaced at once */
export const setOccupations = (
  occupations: readonly OccupationAssignmentPayload[],
): PublicFigureDecision => always(occupationsSet(occupations))

/** A current affiliation to the same organisation is refused; a past one may be followed by a new one */
export const addMembership =
  (input: MembershipInput): PublicFigureDecision =>
  (state) =>
    hasCurrentMembership(state, input.organisationId)
      ? refused(ALREADY_MEMBER, 'publicFigureId')
      : Either.right([membershipAdded(input)])

/** The affiliation must be the figure's */
export const removeMembership =
  (membershipId: string): PublicFigureDecision =>
  (state) =>
    findMembership(state, membershipId)
      ? Either.right([membershipRemoved(membershipId)])
      : refused(MEMBERSHIP_NOT_FOUND)

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

/**
 * Rebuilds the figure from her stream; null for a stream without events.
 * A public figure and an affiliation always have an author (the columns are
 * not null).
 */
export const replayPublicFigure = replayStream(
  decodePublicFigureEvent,
  apply,
  authored(
    ['PublicFigureAdded', 'PublicFigureImported', 'MembershipAdded', 'MembershipImported'],
    'a public figure or an affiliation',
  ),
)

function apply(
  state: PublicFigureState | null,
  { event, stored }: Decoded<PublicFigureEvent>,
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
    createdBy: authorOf(stored),
    createdAt: stored.occurredAt,
    updatedAt: stored.occurredAt,
  })
}

function membershipFrom(
  stored: StoredEvent,
  figure: PublicFigure,
  payload: MembershipContent,
): OrganisationMembership {
  const actor = authorOf(stored)
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
