import { Effect, pipe } from 'effect'
import {
  flaggers,
  replayReview,
  ReviewDecision,
  ReviewedEntity,
  reviewStream,
  ReviewState,
} from '../aggregates/review'
import { ReviewEvent } from '../aggregates/review-events'
import {
  ConcurrencyError,
  EventStore,
  Revision,
  StoredEvent,
  streamRevision,
} from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { ReviewedEntityRepository } from '../repositories/reviewed-entity-repository'
import { found } from './preconditions'
import { grantEach, rewardFor } from './reward'

export const ENTITY_NOT_FOUND = 'Ce contenu est introuvable.'

const entities = Effect.serviceFunctions(ReviewedEntityRepository)

/** The entity a review is about must be on the site; says who added it */
export const originOf = (entity: ReviewedEntity) =>
  Effect.flatMap(entities.findOrigin(entity), found(ENTITY_NOT_FOUND))

/** What a decision made of a review: how it stood before, and what was written */
export interface Reviewed {
  before: ReviewState
  written: readonly ReviewEvent[]
}

/**
 * A command on the review of an entity. Unlike the other aggregates, the
 * stream may hold nothing yet: the first confirmation or flag opens it, so
 * an empty stream is an entity nobody reviewed, not an unknown one — the
 * command checked the entity itself before. The decision is appended at the
 * revision it was taken from: two readers at once do not both pass.
 *
 * `renderedFrom` is the revision a page was rendered from, for a decision
 * taken on what that page showed (settling the flags one has read): a review
 * that moved since is refused, not decided again.
 */
export function decideOnReview(
  events: EventStore,
  entityId: string,
  actorId: string,
  decide: ReviewDecision,
  renderedFrom?: Revision,
) {
  const stream = reviewStream(entityId)
  const stillAt = (history: StoredEvent[]) =>
    renderedFrom === undefined || streamRevision(history) === renderedFrom
  return Effect.flatMap(
    Effect.filterOrFail(
      events.load(stream),
      stillAt,
      () => new ConcurrencyError(stream, renderedFrom!),
    ),
    (history) =>
      pipe(
        replayReview(history),
        Effect.bindTo('before'),
        Effect.bind('written', ({ before }) => decide(before)),
        Effect.tap(({ written }) =>
          written.length > 0
            ? events.append(stream, streamRevision(history), [...written], { actorId })
            : Effect.void,
        ),
        Effect.map(({ before, written }): Reviewed => ({ before, written })),
      ),
  )
}

/**
 * The transaction of a reader's own word (confirming, flagging, taking
 * either back), taken again when another reader wrote on the same entity
 * meanwhile. Readers do not contradict each other: the second one decides
 * again from what the first left, instead of being told to reload a page
 * for a click. Not for a settlement, which is decided on the flags one read.
 */
export const inReview = <A, E>(work: (events: EventStore) => Effect.Effect<A, E>) =>
  Effect.retry(runUnitOfWork(work), {
    times: 3,
    while: (failure) => failure instanceof ConcurrencyError,
  })

/** The grant a reader earns on the entity she reviewed */
export const reviewReward = (
  contributorId: string,
  action: 'confirmed_entity' | 'flag_upheld',
  entity: ReviewedEntity,
) =>
  rewardFor(contributorId, action, {
    relatedEntityType: entity.type,
    relatedEntityId: entity.id,
  })

/**
 * A moderator upheld the flags that were open: each reader who raised one is
 * rewarded — but not the moderator herself. Flagging an entity and then
 * upholding one's own flag would be paying oneself.
 */
export const rewardUpheldFlags = (
  events: EventStore,
  actorId: string,
  entity: ReviewedEntity,
  before: ReviewState,
) =>
  grantEach(
    events,
    actorId,
    flaggers(before)
      .filter((reader) => reader !== actorId)
      .map((reader) => reviewReward(reader, 'flag_upheld', entity)),
  )
