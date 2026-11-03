import { Effect, Either } from 'effect'
import { NextResponse } from 'next/server'
import { FormFailure } from '../../domain/use-cases/run-command'
import { LiveServices, liveServices } from '../../infra/live-services'

/** What the API answers when a command fails: the status says whose fault it is */
export type HttpFailure = {
  status: 400 | 404 | 409 | 500
  body: { error: string; field?: string; fields?: Record<string, string> }
}

/**
 * Maps a command's failure to an HTTP answer. A refusal and a form at fault
 * are the caller's (400), a missing entity is a 404, a value taken or a
 * stream edited meanwhile is a conflict (409), the rest is ours (500).
 */
export function httpFailureOf(failure: FormFailure): HttpFailure {
  switch (failure._tag) {
    case 'NotFound':
      return { status: 404, body: { error: failure.message } }
    case 'Rejected':
      return {
        status: 400,
        body: failure.field
          ? { error: failure.message, field: failure.field }
          : { error: failure.message },
      }
    case 'Invalid':
      return { status: 400, body: { error: 'Invalid fields', fields: failure.fields } }
    case 'UniqueTaken':
    case 'ConcurrencyError':
      return { status: 409, body: { error: failure.message } }
    default:
      return { status: 500, body: { error: failure.message } }
  }
}

/**
 * Runs a command against the live services for an API route: the value on
 * success, or the response to send on failure.
 */
export async function runForApi<A>(
  command: Effect.Effect<A, FormFailure, LiveServices>,
): Promise<{ value: A } | { response: NextResponse }> {
  const outcome = await Effect.runPromise(Effect.either(Effect.provide(command, liveServices())))
  if (Either.isLeft(outcome)) {
    const { status, body } = httpFailureOf(outcome.left)
    return { response: NextResponse.json(body, { status }) }
  }
  return { value: outcome.right }
}
