import { useState } from 'react'
import { ReviewDetail } from '../../../domain/read-models/review'
import ReviewOnEdit from '.'
import { correctionOf, NO_CHOICE } from '../../../domain/read-models/review-on-edit'

/**
 * What an edit form needs of the entity's review: the block to render before
 * its buttons, and what the editor said in it, to send with the edit. Both
 * are nothing for an entity nobody confirmed or flagged.
 */
export function useReviewOnEdit(review: ReviewDetail | null) {
  const [choice, setChoice] = useState(NO_CHOICE)
  return {
    block: review ? <ReviewOnEdit review={review} choice={choice} onChange={setChoice} /> : null,
    correction: correctionOf(review, choice),
  }
}
