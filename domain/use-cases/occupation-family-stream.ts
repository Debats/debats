import { Effect } from 'effect'
import {
  importOccupation,
  importOccupationFamily,
  OCCUPATION_FAMILY_STREAM,
  OccupationFamilyState,
  replayOccupationFamily,
} from '../aggregates/occupation-family'
import { OccupationFamilyEvent } from '../aggregates/occupation-family-events'
import { Occupation } from '../entities/occupation'
import { OccupationFamily } from '../entities/occupation-family'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import { AggregateStream, decideOn, IMPORT, requireState, Source } from './aggregate-stream'

/** What the tables hold of a family, enough to import it into the journal */
export interface OccupationFamilyParts {
  family: OccupationFamily
  occupations: readonly Occupation[]
}

export type OccupationFamilySource = Source<OccupationFamilyParts>

/** A family enters the journal with each of its occupations, dated and signed as their rows */
export const occupationFamilyAggregate: AggregateStream<
  OccupationFamilyState,
  OccupationFamilyEvent,
  OccupationFamilyParts
> = {
  streamType: OCCUPATION_FAMILY_STREAM,
  notFound: 'La famille est introuvable.',
  replay: replayOccupationFamily,
  isLive: (state) => state.deletedAt === null,
  importBatches: ({ family, occupations }) => [
    {
      events: [importOccupationFamily(family)],
      options: { actorId: family.createdBy, metadata: IMPORT, occurredAt: family.createdAt },
    },
    ...occupations.map((occupation) => ({
      events: [importOccupation(occupation)],
      options: {
        actorId: occupation.createdBy,
        metadata: IMPORT,
        occurredAt: occupation.createdAt,
      },
    })),
  ],
}

export const decideOnOccupationFamily = (
  events: EventStore,
  familyId: string,
  actorId: string,
  decide: (state: OccupationFamilyState) => Effect.Effect<OccupationFamilyEvent[], Rejected>,
) => decideOn(occupationFamilyAggregate, events, familyId, actorId, decide)

export const requireOccupationFamilyState = (state: OccupationFamilyState | null) =>
  requireState(occupationFamilyAggregate, state)
