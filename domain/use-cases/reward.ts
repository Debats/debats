import { Array as Arr, Effect } from 'effect'
import { contributorStream, GrantInput, reputationGranted } from '../aggregates/contributor'
import { EventStore, UniqueTaken } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { reputationReward, RewardableAction } from '../reputation/permissions'

export interface Grant extends GrantInput {
  contributorId: string
}

/** What a grant rewards: the entity the deed was done on */
export type RewardedOn = { relatedEntityType: Grant['relatedEntityType']; relatedEntityId: string }

/** A grant of an amount the command sets, on the entity it rewards; the command names it, as every id */
export const grantOf = (
  contributorId: string,
  action: RewardableAction,
  amount: number,
  related?: RewardedOn,
): Grant => ({
  grantId: crypto.randomUUID(),
  contributorId,
  action,
  amount,
  ...related,
})

/** The grant the scale gives for an action, on the entity it rewards */
export const rewardFor = (
  contributorId: string,
  action: RewardableAction,
  related?: RewardedOn,
): Grant => grantOf(contributorId, action, reputationReward(action), related)

/**
 * Records grants on the contributors' streams, in the transaction of the deed
 * they reward: a deed and its rewards are written together or not at all.
 * One contributor's grants go in one append, at the end of her stream: nothing
 * is decided from the stream at a revision (permissions and the invitee's start
 * read the projected total, on purpose), so two deeds of hers at once never
 * conflict. Streams are taken in id order: two commands rewarding the same two
 * contributors lock them the same way round. The actor is the contributor
 * whose command earned them.
 */
export function grantEach(
  events: EventStore,
  actorId: string,
  rewards: readonly Grant[],
): Effect.Effect<void, DatabaseError | UniqueTaken> {
  const byContributor = Arr.groupBy(rewards, (reward) => reward.contributorId)
  return Effect.forEach(
    Object.entries(byContributor).sort(([a], [b]) => a.localeCompare(b)),
    ([contributorId, grants]) =>
      events.appendToEnd(contributorStream(contributorId), grants.map(reputationGranted), {
        actorId,
      }),
    { discard: true },
  )
}

export const grant = (
  events: EventStore,
  actorId: string,
  reward: Grant,
): Effect.Effect<void, DatabaseError | UniqueTaken> => grantEach(events, actorId, [reward])
