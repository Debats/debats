import { Effect, Layer } from 'effect'
import { ReviewedEntity } from '../aggregates/review'
import { ReviewedEntityRepository } from '../repositories/reviewed-entity-repository'

/** A statement Léa added, for the others to review */
export const leasStatement: ReviewedEntity = { type: 'statement', id: 'statement-1' }

export const reader = (id: string, reputation = 0) => ({ id, reputation })
export const moderator = { id: 'jalil', reputation: 10000 }

/** The read side knowing these entities by id, each with the contributor who added it */
export const reviewedEntities = (addedBy: Record<string, string | null>) =>
  Layer.succeed(ReviewedEntityRepository, {
    findOrigin: (entity) =>
      Effect.succeed(entity.id in addedBy ? { addedBy: addedBy[entity.id] } : null),
  })

/** The site as the tests know it: Léa's statement, and a subject of hers */
export const site = reviewedEntities({ 'statement-1': 'lea', 'subject-1': 'lea' })

/** The facts a journal holds on the review of an entity, as `[actor, type]`, in order */
export const reviewFactsIn = (journal: {
  all(): Array<{ streamType: string; actorId: string | null; type: string }>
}): Array<[string | null, string]> =>
  journal
    .all()
    .filter((event) => event.streamType === 'review')
    .map((event) => [event.actorId, event.type])
