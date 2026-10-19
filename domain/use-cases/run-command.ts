import { Effect, Either } from 'effect'
import { ConcurrencyError, UnreadableEvent } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { Rejected } from './types'

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
  if (Either.isRight(outcome)) return Either.right(outcome.right)
  switch (outcome.left._tag) {
    case 'Rejected':
      return Either.left(outcome.left.message)
    case 'ConcurrencyError':
      return Either.left(EDITED_MEANWHILE)
    default:
      throw outcome.left
  }
}
