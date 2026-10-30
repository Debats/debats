import { Effect } from 'effect'
import {
  OccupationFamilyDecision,
  OCCUPATION_FAMILY_STREAM,
  OccupationFamilyState,
  replayOccupationFamily,
} from '../aggregates/occupation-family'
import { OccupationFamilyEvent } from '../aggregates/occupation-family-events'
import { Occupation } from '../entities/occupation'
import { EventStore } from '../events/event-store'
import { AggregateStream, Decided, decideOn, requireState } from './aggregate-stream'

export const occupationFamilyAggregate: AggregateStream<
  OccupationFamilyState,
  OccupationFamilyEvent
> = {
  streamType: OCCUPATION_FAMILY_STREAM,
  notFound: 'La famille est introuvable.',
  replay: replayOccupationFamily,
  isLive: (state) => state.deletedAt === null,
}

export const decideOnOccupationFamily = (
  events: EventStore,
  familyId: string,
  actorId: string,
  decide: OccupationFamilyDecision,
) => decideOn(occupationFamilyAggregate, events, familyId, actorId, decide)

export const requireOccupationFamilyState = (state: OccupationFamilyState | null) =>
  requireState(occupationFamilyAggregate, state)

/** The occupation the decision just wrote: a family without it has a broken replay */
export const writtenOccupation =
  (occupationId: string) =>
  ({ state }: Decided<OccupationFamilyState>): Effect.Effect<Occupation> => {
    const occupation = state.occupations.find((o) => o.id === occupationId)
    return occupation
      ? Effect.succeed(occupation)
      : Effect.dieMessage(`The occupation ${occupationId} just written is missing from the family`)
  }
