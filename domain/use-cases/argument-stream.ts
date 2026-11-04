import {
  ArgumentDecision,
  ARGUMENT_STREAM,
  ArgumentState,
  isLiveArgument,
  replayArgument,
} from '../aggregates/argument'
import { ArgumentEvent } from '../aggregates/argument-events'
import { EventStore, Revision } from '../events/event-store'
import { AggregateStream, decideOn, loadStream, requireState } from './aggregate-stream'

export const argumentAggregate: AggregateStream<ArgumentState, ArgumentEvent> = {
  streamType: ARGUMENT_STREAM,
  notFound: 'Argument introuvable.',
  replay: replayArgument,
  isLive: isLiveArgument,
}

export const loadArgument = (events: EventStore, argumentId: string) =>
  loadStream(argumentAggregate, events, argumentId)

export const decideOnArgument = (
  events: EventStore,
  argumentId: string,
  actorId: string,
  decide: ArgumentDecision,
  renderedFrom?: Revision,
) => decideOn(argumentAggregate, events, argumentId, actorId, decide, renderedFrom)

export const requireArgumentState = (state: ArgumentState | null) =>
  requireState(argumentAggregate, state)
