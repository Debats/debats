import { Effect, Either } from 'effect'
import { ConcurrencyError, UnreadableEvent } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { FieldErrors, Rejected } from './types'

export const EDITED_MEANWHILE =
  'Quelqu’un d’autre vient de modifier ceci. Rechargez la page avant de recommencer.'

export type CommandFailure = Rejected | ConcurrencyError | DatabaseError | UnreadableEvent

/**
 * Runs a command against the journal and turns its outcome into what the
 * contributor can act on: a refusal or a race become a message, anything
 * else is a failure of the system and is thrown.
 */
export async function runCommand<A>(
  command: Effect.Effect<A, CommandFailure>,
): Promise<Either.Either<A, string>> {
  const outcome = await Effect.runPromise(Effect.either(command))
  return Either.isRight(outcome)
    ? Either.right(outcome.right)
    : Either.left(messageOf(outcome.left))
}

/**
 * The same, for a command behind a form: a refusal that blames one field
 * comes back under that field's name, so the form can show it in place.
 */
export async function runFormCommand<A>(
  command: Effect.Effect<A, CommandFailure>,
): Promise<Either.Either<A, string | FieldErrors>> {
  const outcome = await Effect.runPromise(Effect.either(command))
  if (Either.isRight(outcome)) return Either.right(outcome.right)
  const failure = outcome.left
  return failure._tag === 'Rejected' && failure.field
    ? Either.left({ [failure.field]: failure.message })
    : Either.left(messageOf(failure))
}

function messageOf(failure: CommandFailure): string {
  switch (failure._tag) {
    case 'Rejected':
      return failure.message
    case 'ConcurrencyError':
      return EDITED_MEANWHILE
    default:
      throw failure
  }
}
