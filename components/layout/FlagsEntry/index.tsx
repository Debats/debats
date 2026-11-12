'use client'

import { useEffect, useState } from 'react'
import * as Sentry from '@sentry/nextjs'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { flagsToSettleAction } from '../../../app/actions/flags-to-settle'
import { FLAGS_HREF } from '../../../domain/read-models/hrefs'
import styles from './FlagsEntry.module.css'

/** Not asked yet, not a moderator (never asked again), or how many entities wait */
type Waiting = 'unknown' | 'not-for-her' | number

/**
 * L'entrée « Signalements » de l'en-tête, pour qui peut les traiter : elle
 * n'existe pas pour les autres. Le compte est relu à chaque changement de
 * page, puisqu'on vient peut-être d'en traiter un ; un compte qui n'a pas le
 * droit de traiter n'est interrogé qu'une fois.
 */
export default function FlagsEntry() {
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

  if (typeof waiting !== 'number') return null

  return (
    <Link href={FLAGS_HREF} className={styles.entry}>
      Signalements
      {waiting > 0 && <span className={styles.count}>{waiting}</span>}
    </Link>
  )
}
