import { Effect } from 'effect'
import {
  ARGUMENT_STREAM,
  ArgumentState,
  importArgument,
  isLiveArgument,
  replayArgument,
} from '../aggregates/argument'
import { ArgumentEvent } from '../aggregates/argument-events'
import { Argument } from '../entities/argument'
import { EventStore } from '../events/event-store'
import { Rejected } from './types'
import {
  AggregateStream,
  decideOn,
  IMPORT,
  loadOrImport,
  requireState,
  Source,
} from './aggregate-stream'

/** What the tables hold of an argument, enough to import it into the journal */
export interface ArgumentParts {
  argument: Argument
}

export type ArgumentSource = Source<ArgumentParts>

export const argumentAggregate: AggregateStream<ArgumentState, ArgumentEvent, ArgumentParts> = {
  streamType: ARGUMENT_STREAM,
  notFound: 'Argument introuvable.',
  replay: replayArgument,
  isLive: isLiveArgument,
  importBatches: ({ argument }) => [
    {
      events: [importArgument(argument)],
      options: {
        actorId: argument.createdBy,
        metadata: IMPORT,
        occurredAt: argument.createdAt,
      },
    },
  ],
}

export const loadOrImportArgument = (
  events: EventStore,
  argumentId: string,
  source: ArgumentSource,
) => loadOrImport(argumentAggregate, events, argumentId, source)

export const decideOnArgument = (
  events: EventStore,
  argumentId: string,
  source: ArgumentSource,
  actorId: string,
  decide: (state: ArgumentState) => Effect.Effect<ArgumentEvent[], Rejected>,
) => decideOn(argumentAggregate, events, argumentId, source, actorId, decide)

export const requireArgumentState = (state: ArgumentState | null) =>
  requireState(argumentAggregate, state)
