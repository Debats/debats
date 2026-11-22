'use client'

import { useCallback, useState } from 'react'
import { unstable_rethrow } from 'next/navigation'
import * as Sentry from '@sentry/nextjs'

type ActionOutcome = { success: true } | { success: false; error: string } | undefined

const UNEXPECTED = 'Une erreur inattendue est survenue.'

/**
 * Runs a server action that leads the contributor elsewhere when it succeeds
 * and returns its refusal otherwise. The form stays pending until the new
 * page is there; a refusal, or a failure reported to Sentry with `context`,
 * hands it back with the message to show.
 */
export function useRedirectingAction() {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string>()

  const run = useCallback(
    async (action: () => Promise<ActionOutcome>, context: Record<string, unknown>) => {
      setError(undefined)
      setIsPending(true)
      try {
        const outcome = await action()
        if (outcome && !outcome.success) {
          setError(outcome.error)
          setIsPending(false)
        }
      } catch (failure: unknown) {
        // The redirection itself comes as an error of the router: it must go through
        unstable_rethrow(failure)
        Sentry.captureException(failure, { extra: context })
        setError(UNEXPECTED)
        setIsPending(false)
      }
    },
    [],
  )

  return { run, isPending, error }
}
