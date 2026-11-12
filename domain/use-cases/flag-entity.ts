import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { flag, ReviewedEntity, withdrawFlag } from '../aggregates/review'
import { FLAG_REASONS } from '../aggregates/review-events'
import { allowedTo, fieldsOf, signedIn } from './preconditions'
import { decideOnReview, inReview, originOf } from './review-stream'
import { ContributorIdentity } from './types'

/** What a flag says: one reason of the closed list, and a comment that makes it checkable */
export const FlagForm = S.Struct({
  reason: S.Literal(...FLAG_REASONS),
  comment: S.Trim.pipe(S.minLength(10), S.maxLength(1000)),
})

/** A flag as the form sends it */
export type NewFlag = S.Schema.Encoded<typeof FlagForm>

const FLAG_MESSAGES = {
  reason: 'Choisissez ce qui ne va pas.',
  comment: 'Dites ce qui ne va pas, en 10 à 1000 caractères.',
}

type FlagParams = {
  contributor: ContributorIdentity | null
  entity: ReviewedEntity
}

/**
 * A reader says something is wrong with the entity, and what. Open to every
 * account in good standing, but not to the one who added the entity; one
 * open flag each. Nothing is earned yet: a flag is rewarded when a
 * moderator upholds it.
 */
export function flagEntityUseCase({ contributor, entity, ...input }: FlagParams & NewFlag) {
  return pipe(
    Effect.all({
      reader: allowedTo(contributor, 'flag_entity', 'signaler un contenu'),
      said: fieldsOf(FlagForm, FLAG_MESSAGES)(input),
      origin: originOf(entity),
    }),
    Effect.flatMap(({ reader, said, origin }) => {
      // The flag's id is the command's to choose, as every id; the same one if the transaction is taken again
      const flagId = crypto.randomUUID()
      return inReview((events) =>
        decideOnReview(
          events,
          entity.id,
          reader.id,
          flag(entity.type, reader.id, origin.addedBy, { flagId, ...said }),
        ),
      )
    }),
    Effect.asVoid,
  )
}

/**
 * The reader takes her flag back, while nobody has settled it. Taking back
 * one's own word takes no rank: being signed in is enough.
 */
export function withdrawFlagUseCase({ contributor, entity }: FlagParams) {
  return pipe(
    signedIn(contributor),
    Effect.flatMap((reader) =>
      inReview((events) => decideOnReview(events, entity.id, reader.id, withdrawFlag(reader.id))),
    ),
    Effect.asVoid,
  )
}
