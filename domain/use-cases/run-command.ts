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
export function runCommand<A>(
  command: Effect.Effect<A, CommandFailure>,
): Promise<Either.Either<A, string>> {
  return outcomeOf(command, messageOf)
}

/**
 * The same, for a command behind a form: a refusal that blames one field
 * comes back under that field's name, so the form can show it in place.
 */
export function runFormCommand<A>(
  command: Effect.Effect<A, CommandFailure>,
): Promise<Either.Either<A, string | FieldErrors>> {
  return outcomeOf(command, (failure) =>
    failure._tag === 'Rejected' && failure.field
      ? { [failure.field]: failure.message }
      : messageOf(failure),
  )
}

async function outcomeOf<A, E>(
  command: Effect.Effect<A, CommandFailure>,
  describe: (failure: CommandFailure) => E,
): Promise<Either.Either<A, E>> {
  const outcome = await Effect.runPromise(Effect.either(command))
  return Either.mapLeft(outcome, describe)
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
