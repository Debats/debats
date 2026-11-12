import { useState } from 'react'
import {
  confirmEntityAction,
  flagEntityAction,
  ReviewResult,
  withdrawConfirmationAction,
  withdrawFlagAction,
} from '../../../app/actions/review'
import { ReviewedEntity } from '../../../domain/aggregates/review'
import { ReviewMark } from '../../../domain/read-models/review'
import { NewFlag } from '../../../domain/use-cases/flag-entity'

const UNREACHABLE = 'Le site n’a pas répondu. Réessayez dans un instant.'

/**
 * The mark of an entity as the viewer's own words change it: each of them is
 * sent to the server, which answers with the mark it leaves or with why it
 * was refused. A server that does not answer is a refusal like another: the
 * viewer is told, and may try again.
 */
export function useReview(entity: ReviewedEntity, initial: ReviewMark) {
  const [mark, setMark] = useState(initial)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function say(word: () => Promise<ReviewResult>): Promise<ReviewResult> {
    setBusy(true)
    setError('')
    const result = await word().catch((): ReviewResult => ({ success: false, error: UNREACHABLE }))
    if (result.success) setMark(result.mark)
    else setError(result.error)
    setBusy(false)
    return result
  }

  return {
    mark,
    busy,
    error,
    confirm: () => say(() => confirmEntityAction(entity)),
    withdrawConfirmation: () => say(() => withdrawConfirmationAction(entity)),
    flag: (flag: NewFlag) => say(() => flagEntityAction(entity, flag)),
    withdrawFlag: () => say(() => withdrawFlagAction(entity)),
  }
}

export type Review = ReturnType<typeof useReview>
