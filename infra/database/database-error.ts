import * as Sentry from '@sentry/nextjs'
import { DatabaseError } from '../../domain/repositories/errors'

/**
 * Turns an infrastructure failure into the domain's DatabaseError, reported
 * to Sentry with the context that names what was being done.
 */
export function databaseError(context: string, error: unknown): DatabaseError {
  const detail = error instanceof Error ? error.message || String(error) : JSON.stringify(error)
  Sentry.captureException(error, { extra: { message: context } })
  return new DatabaseError(`${context}: ${detail}`)
}
