import { Array as Arr, Effect, pipe } from 'effect'
import { contributorStream, GrantInput, grantReputation } from '../aggregates/contributor'
import { ConcurrencyError, EventStore, streamRevision } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { reputationReward, RewardableAction } from '../reputation/permissions'

export interface Grant extends GrantInput {
  contributorId: string
}

/** The grant the scale gives for an action, on the entity it rewards */
export const rewardFor = (
  contributorId: string,
  action: RewardableAction,
  related?: { relatedEntityType: Grant['relatedEntityType']; relatedEntityId: string },
): Grant => ({ contributorId, action, amount: reputationReward(action), ...related })

/**
 * Records grants on the contributors' streams, in the transaction of the deed
 * they reward: a deed and its rewards are written together or not at all.
 * One contributor's grants go in one append. The actor is the contributor
 * whose command earned them.
 */
export function grantEach(
  events: EventStore,
  actorId: string,
  rewards: readonly Grant[],
): Effect.Effect<void, DatabaseError | ConcurrencyError> {
  const byContributor = Arr.groupBy(rewards, (reward) => reward.contributorId)
  return Effect.forEach(
    Object.entries(byContributor),
    ([contributorId, grants]) => {
      const stream = contributorStream(contributorId)
      return pipe(
        events.load(stream),
        Effect.flatMap((history) =>
          events.append(stream, streamRevision(history), grants.map(grantReputation), { actorId }),
        ),
      )
    },
    { discard: true },
  )
}

export const grant = (
  events: EventStore,
  actorId: string,
  reward: Grant,
): Effect.Effect<void, DatabaseError | ConcurrencyError> => grantEach(events, actorId, [reward])
