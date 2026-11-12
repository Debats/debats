import { Context, Effect } from 'effect'
import { ReviewedEntity } from '../aggregates/review'
import { DatabaseError } from './errors'

/** What a review needs to know of the entity it is about: that it is there, and who added it */
export interface ReviewedEntityOrigin {
  /** The contributor who added the entity; null when the site holds it unsigned */
  addedBy: string | null
}

/** Read side of the entities a reader may confirm or flag, whatever their kind */
export interface ReviewedEntityRepository {
  /** Null for an entity the site does not hold, or no longer */
  findOrigin(entity: ReviewedEntity): Effect.Effect<ReviewedEntityOrigin | null, DatabaseError>
}

export const ReviewedEntityRepository = Context.GenericTag<ReviewedEntityRepository>(
  'ReviewedEntityRepository',
)
