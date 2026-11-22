import { Effect, Either, pipe } from 'effect'
import {
  JOINT_DECLARATION_STREAM,
  JointDeclarationCascade,
  JointDeclarationDecision,
  JointDeclarationState,
  replayJointDeclaration,
} from '../aggregates/joint-declaration'
import { JointDeclarationEvent } from '../aggregates/joint-declaration-events'
import { EventStore } from '../events/event-store'
import { AggregateStream, decideOn } from './aggregate-stream'

export const jointDeclarationAggregate: AggregateStream<
  JointDeclarationState,
  JointDeclarationEvent
> = {
  streamType: JOINT_DECLARATION_STREAM,
  notFound: 'Déclaration commune introuvable.',
  replay: replayJointDeclaration,
  // Nothing deletes a joint declaration yet: its stream is live as long as it exists
  isLive: () => true,
}

export const decideOnJointDeclaration = (
  events: EventStore,
  declarationId: string,
  actorId: string,
  decide: JointDeclarationDecision,
) => decideOn(jointDeclarationAggregate, events, declarationId, actorId, decide)

/**
 * The same cascade on each of several joint declarations, each in its own
 * stream: what a command on a subject does to the texts that took one of its
 * positions. A text the journal does not know is skipped, not refused: a
 * cascade has nothing to say to what is not there.
 */
export function decideOnEachJointDeclaration(
  events: EventStore,
  declarationIds: readonly string[],
  actorId: string,
  cascade: JointDeclarationCascade,
) {
  return Effect.forEach(
    declarationIds,
    (id) =>
      pipe(
        decideOn(jointDeclarationAggregate, events, id, actorId, (state) =>
          Either.right(cascade(state)),
        ),
        Effect.catchTag('NotFound', () => Effect.void),
      ),
    { discard: true },
  )
}
