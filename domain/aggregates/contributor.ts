import { Either } from 'effect'
import { RelatedEntityType, ReputationEvent } from '../entities/reputation-event'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
import { RewardableAction } from '../reputation/permissions'
import { ContributorEvent, decodeContributorEvent, GrantPayload } from './contributor-events'

export const CONTRIBUTOR_STREAM = 'contributor'

export const contributorStream = (id: string): StreamRef => ({
  streamType: CONTRIBUTOR_STREAM,
  streamId: id,
})

/** What the journal says of a contributor: her reputation and how she earned it */
export interface ContributorState {
  reputation: number
  grants: readonly ReputationEvent[]
}

export interface GrantInput {
  action: RewardableAction
  amount: number
  relatedEntityType?: RelatedEntityType
  relatedEntityId?: string
}

/** Decision: the site rewards (or sanctions) a contributor for a deed */
export const grantReputation = (input: GrantInput): ContributorEvent => ({
  type: 'ReputationGranted',
  payload: {
    grantId: crypto.randomUUID(),
    action: input.action,
    amount: input.amount,
    ...(input.relatedEntityType ? { relatedEntityType: input.relatedEntityType } : {}),
    ...(input.relatedEntityId ? { relatedEntityId: input.relatedEntityId } : {}),
  },
})

/** Rebuilds the contributor from her stream; a contributor without a grant stands at zero */
export function replayContributor(
  events: StoredEvent[],
): Either.Either<ContributorState, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        Either.map(decodeContributorEvent(stored), (event) => grantFrom(stored, event.payload)),
      ),
    ),
    (grants) => ({ reputation: grants.reduce((total, g) => total + g.amount, 0), grants }),
  )
}

function grantFrom(stored: StoredEvent, payload: GrantPayload): ReputationEvent {
  return {
    id: payload.grantId,
    contributorId: stored.streamId,
    action: payload.action as RewardableAction,
    amount: payload.amount,
    relatedEntityType: payload.relatedEntityType as RelatedEntityType | undefined,
    relatedEntityId: payload.relatedEntityId,
    createdAt: stored.occurredAt,
  }
}
