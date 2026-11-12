import { ReviewDetail } from '../../../domain/read-models/review'
import { NewCorrection } from '../../../domain/use-cases/record-correction'

/** What the editor has said so far of the entity's review, as the block holds it */
export interface ReviewChoice {
  settlesFlags: boolean
  answer: string
  /** Null until she chose: nothing is chosen for her */
  resetConfirmations: boolean | null
}

export const NO_CHOICE: ReviewChoice = { settlesFlags: false, answer: '', resetConfirmations: null }

/** The review an edit form has something to say of: one with a flag open or a confirmation given */
export const reviewToSpeakOf = (detail: ReviewDetail): ReviewDetail | null =>
  detail.flags.length > 0 || detail.confirmations > 0 ? detail : null

/**
 * What the form sends with the edit: nothing when the entity has no review
 * to speak of. The browser has required the choice on the confirmations
 * before the form was sent; unanswered all the same, they are kept.
 */
export const correctionOf = (
  review: ReviewDetail | null,
  choice: ReviewChoice,
): NewCorrection | undefined =>
  review
    ? {
        settlesFlags: choice.settlesFlags,
        answer: choice.answer,
        resetConfirmations: choice.resetConfirmations ?? false,
      }
    : undefined
