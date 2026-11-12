import { Either } from 'effect'
import { StoredEvent, StreamRef, UnreadableEvent } from '../events/event-store'
import { Cascade, Decision, refused } from './decision'
import { authored, authorOf } from './replay'
import {
  decodeReviewEvent,
  FlagOutcome,
  FlagPayload,
  ReviewedEntityType,
  ReviewEvent,
} from './review-events'

export const REVIEW_STREAM = 'review'

/** The review of an entity lives under the entity's own id */
export const reviewStream = (entityId: string): StreamRef => ({
  streamType: REVIEW_STREAM,
  streamId: entityId,
})

/** What a reader confirms or flags: one entity of the site, named by its kind and its id */
export interface ReviewedEntity {
  type: ReviewedEntityType
  id: string
}

/** A flag nobody settled yet: what decisions need of it is whose it is */
export interface OpenFlag {
  id: string
  by: string
}

/** What the journal says readers made of an entity, right now */
export interface ReviewState {
  confirmedBy: readonly string[]
  /** Who already earned a confirmation of this version: confirming again earns nothing */
  rewardedConfirmers: readonly string[]
  openFlags: readonly OpenFlag[]
}

/** An entity nobody confirmed or flagged: its stream holds nothing yet */
export const emptyReview: ReviewState = { confirmedBy: [], rewardedConfirmers: [], openFlags: [] }

const hasConfirmed = (state: ReviewState, contributorId: string) =>
  state.confirmedBy.includes(contributorId)

const openFlagOf = (state: ReviewState, contributorId: string) =>
  state.openFlags.find((flag) => flag.by === contributorId)

/** Whether this confirmation is the reader's first of this version: only that one earns */
export const earnsConfirmation = (state: ReviewState, contributorId: string): boolean =>
  !state.rewardedConfirmers.includes(contributorId)

/** The readers whose flags are open: those a settlement that upholds them rewards */
export const flaggers = (state: ReviewState): string[] => state.openFlags.map((flag) => flag.by)

/* Facts: what the stream records, named in the past tense as the events they are */

export const confirmed = (entityType: ReviewedEntityType): ReviewEvent => ({
  type: 'Confirmed',
  payload: { entityType },
})

export const confirmationWithdrawn = (): ReviewEvent => ({
  type: 'ConfirmationWithdrawn',
  payload: {},
})

export type FlagInput = Omit<FlagPayload, 'entityType'>

export const flagged = (entityType: ReviewedEntityType, input: FlagInput): ReviewEvent => ({
  type: 'Flagged',
  payload: { entityType, ...input },
})

export const flagWithdrawn = (flagId: string): ReviewEvent => ({
  type: 'FlagWithdrawn',
  payload: { flagId },
})

export const flagsSettled = (outcome: FlagOutcome, answer: string | undefined): ReviewEvent => ({
  type: 'FlagsSettled',
  payload: { outcome, ...(answer ? { answer } : {}) },
})

export const confirmationsReset = (): ReviewEvent => ({ type: 'ConfirmationsReset', payload: {} })

/* Decisions: what a command asks of the review, decided from its state */

export type ReviewDecision = Decision<ReviewState, ReviewEvent>
export type ReviewCascade = Cascade<ReviewState, ReviewEvent>

export const OWN_CONTRIBUTION = 'Vous avez ajouté ce contenu : à d’autres de le vérifier.'
export const ALREADY_FLAGGED = 'Vous avez déjà un signalement en cours sur ce contenu.'
export const NOTHING_TO_SETTLE = 'Aucun signalement en cours sur ce contenu.'
export const ANSWER_REQUIRED = 'Dites ce que vous avez vérifié.'

/**
 * A reader confirms the entity. Not the one who added it; a reader who had
 * flagged it takes the flag back by confirming, one cannot do both.
 */
export const confirm =
  (
    entityType: ReviewedEntityType,
    contributorId: string,
    authorId: string | null,
  ): ReviewDecision =>
  (state) => {
    if (contributorId === authorId) return refused(OWN_CONTRIBUTION)
    if (hasConfirmed(state, contributorId)) return Either.right([])
    const own = openFlagOf(state, contributorId)
    return Either.right([...(own ? [flagWithdrawn(own.id)] : []), confirmed(entityType)])
  }

export const withdrawConfirmation =
  (contributorId: string): ReviewDecision =>
  (state) =>
    Either.right(hasConfirmed(state, contributorId) ? [confirmationWithdrawn()] : [])

/**
 * A reader flags the entity. Not the one who added it, and one open flag
 * each; a reader who had confirmed it takes the confirmation back by flagging.
 */
export const flag =
  (
    entityType: ReviewedEntityType,
    contributorId: string,
    authorId: string | null,
    input: FlagInput,
  ): ReviewDecision =>
  (state) => {
    if (contributorId === authorId) return refused(OWN_CONTRIBUTION)
    if (openFlagOf(state, contributorId)) return refused(ALREADY_FLAGGED)
    return Either.right([
      ...(hasConfirmed(state, contributorId) ? [confirmationWithdrawn()] : []),
      flagged(entityType, input),
    ])
  }

export const withdrawFlag =
  (contributorId: string): ReviewDecision =>
  (state) => {
    const own = openFlagOf(state, contributorId)
    return Either.right(own ? [flagWithdrawn(own.id)] : [])
  }

/** How a moderator settles flags without editing the entity: they do not hold, or the entity goes */
export type Settlement = Exclude<FlagOutcome, 'corrected'>

/**
 * A moderator closes every open flag without editing the entity, and
 * answers for it: the flags do not hold, or the entity is beyond repair.
 * A correction is not settled here: it comes with the edit (`correct`).
 */
export const settle =
  (outcome: Settlement, answer: string): ReviewDecision =>
  (state) => {
    const said = answer.trim()
    if (state.openFlags.length === 0) return refused(NOTHING_TO_SETTLE)
    if (!said) return refused(ANSWER_REQUIRED, 'answer')
    return Either.right([flagsSettled(outcome, said)])
  }

/** What the one who edits an entity says of its review; nothing follows from the edit alone */
export interface Correction {
  /** The edit answers the open flags: they are closed as corrected. An edit made for another reason leaves them open */
  settlesFlags: boolean
  /** What she answers to the flags she settles, if anything: a correction speaks for itself */
  answer?: string
  /** The edit changes what readers had confirmed: their confirmations no longer stand */
  resetConfirmations: boolean
}

/**
 * The entity was edited, and the one who edited it says what that makes of
 * its review: the open flags settled as corrected, the confirmations reset,
 * both or neither. Nothing to say of an entity nobody reviewed.
 */
export const correct =
  ({ settlesFlags, answer, resetConfirmations }: Correction): ReviewCascade =>
  (state) => [
    ...(settlesFlags && state.openFlags.length > 0
      ? [flagsSettled('corrected', answer?.trim() || undefined)]
      : []),
    ...(resetConfirmations && state.confirmedBy.length > 0 ? [confirmationsReset()] : []),
  ]

/**
 * The entity left the site, folded into another: the flags open on it have
 * nothing left to be about, and are closed with it, as on a removal.
 */
export const leaveWithEntity = (): ReviewCascade => (state) =>
  state.openFlags.length > 0 ? [flagsSettled('removed', undefined)] : []

/**
 * Rebuilds the review from its stream. A stream without events is an entity
 * nobody reviewed yet, not an unknown one: the review has no creation.
 * Every fact but a reset or a settlement is somebody's: unsigned, it is corrupt.
 */
export function replayReview(events: StoredEvent[]): Either.Either<ReviewState, UnreadableEvent> {
  return Either.map(
    Either.all(
      events.map((stored) =>
        Either.flatMap(decodeReviewEvent(stored), (event) => signed({ event, stored })),
      ),
    ),
    (decoded) =>
      decoded.reduce((state, { event, stored }) => apply(state, event, stored), emptyReview),
  )
}

const signed = authored<ReviewEvent>(
  ['Confirmed', 'ConfirmationWithdrawn', 'Flagged'],
  'a confirmation or a flag',
)

const without = (ids: readonly string[], id: string) => ids.filter((other) => other !== id)

function apply(state: ReviewState, event: ReviewEvent, stored: StoredEvent): ReviewState {
  switch (event.type) {
    case 'Confirmed': {
      const reader = authorOf(stored)
      return {
        ...state,
        confirmedBy: [...without(state.confirmedBy, reader), reader],
        rewardedConfirmers: [...without(state.rewardedConfirmers, reader), reader],
      }
    }
    case 'ConfirmationWithdrawn':
      return { ...state, confirmedBy: without(state.confirmedBy, authorOf(stored)) }
    case 'Flagged':
      return {
        ...state,
        openFlags: [...state.openFlags, { id: event.payload.flagId, by: authorOf(stored) }],
      }
    case 'FlagWithdrawn':
      return {
        ...state,
        openFlags: state.openFlags.filter((flag) => flag.id !== event.payload.flagId),
      }
    case 'FlagsSettled':
      return { ...state, openFlags: [] }
    case 'ConfirmationsReset':
      return { ...state, confirmedBy: [], rewardedConfirmers: [] }
  }
}
