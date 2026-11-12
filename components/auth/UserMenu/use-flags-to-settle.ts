import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import { usePathname } from 'next/navigation'
import { flagsToSettleAction } from '../../../app/actions/flags-to-settle'

/** Not asked yet, not a moderator (never asked again), or how many entities wait */
type Waiting = 'unknown' | 'not-for-her' | number

/**
 * How many flagged entities wait for the signed-in contributor, when she may
 * settle them; null otherwise. Read again at each change of page, since she
 * may just have settled one; an account that may not settle is asked once.
 */
export function useFlagsToSettle(): number | null {
  const pathname = usePathname()
  const [waiting, setWaiting] = useState<Waiting>('unknown')
  const asks = waiting !== 'not-for-her'

  useEffect(() => {
    if (!asks) return
    let current = true
    flagsToSettleAction()
      .then((count): Waiting => count ?? 'not-for-her')
      // A count that cannot be read is reported and hides the entry until the next page: the queue stays reachable by its address
      .catch((error: unknown): Waiting => {
        Sentry.captureException(error)
        return 'unknown'
      })
      .then((answer) => {
        if (current) setWaiting(answer)
      })
    return () => {
      current = false
    }
  }, [pathname, asks])

  return typeof waiting === 'number' ? waiting : null
}
