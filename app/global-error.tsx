'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="fr">
      <body>
        <h1>Une erreur est survenue</h1>
        <p>Nous avons été notifiés et travaillons à la résoudre.</p>
        <button onClick={() => reset()}>Réessayer</button>
      </body>
    </html>
  )
}
