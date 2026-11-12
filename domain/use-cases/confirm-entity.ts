import { Effect, pipe } from 'effect'
import {
  confirm,
  earnsConfirmation,
  ReviewedEntity,
  withdrawConfirmation,
} from '../aggregates/review'
import { allowedTo, signedIn } from './preconditions'
import { grant } from './reward'
import { decideOnReview, inReview, originOf, Reviewed, reviewReward } from './review-stream'
import { ContributorIdentity } from './types'

type ReviewParams = {
  contributor: ContributorIdentity | null
  entity: ReviewedEntity
}

/** The confirmation was written, and is the reader's first of this version */
const earned = ({ before, written }: Reviewed, readerId: string) =>
  written.some((event) => event.type === 'Confirmed') && earnsConfirmation(before, readerId)

/**
 * A reader says she checked the entity and found it right: one click, no
 * form. Open to every account in good standing, but not to the one who
 * added the entity. The first confirmation of a version earns a point, in
 * the same transaction; confirming again after a withdrawal earns nothing.
 */
export function confirmEntityUseCase({ contributor, entity }: ReviewParams) {
  return pipe(
    Effect.all({
      reader: allowedTo(contributor, 'confirm_entity', 'confirmer un contenu'),
      origin: originOf(entity),
    }),
    Effect.flatMap(({ reader, origin }) =>
      inReview((events) =>
        pipe(
          decideOnReview(
            events,
            entity.id,
            reader.id,
            confirm(entity.type, reader.id, origin.addedBy),
          ),
          Effect.tap((reviewed) =>
            earned(reviewed, reader.id)
              ? grant(events, reader.id, reviewReward(reader.id, 'confirmed_entity', entity))
              : Effect.void,
          ),
        ),
      ),
    ),
    Effect.asVoid,
  )
}

/**
 * The reader takes her confirmation back; the point it earned stays earned.
 * Taking back one's own word takes no rank: being signed in is enough.
 */
export function withdrawConfirmationUseCase({ contributor, entity }: ReviewParams) {
  return pipe(
    signedIn(contributor),
    Effect.flatMap((reader) =>
      inReview((events) =>
        decideOnReview(events, entity.id, reader.id, withdrawConfirmation(reader.id)),
      ),
    ),
    Effect.asVoid,
  )
}
