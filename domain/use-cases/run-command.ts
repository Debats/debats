import { Effect, Either } from 'effect'
import { ConcurrencyError, UniqueTaken, UnreadableEvent } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { FieldErrors, NotFound, Rejected } from './types'

export const EDITED_MEANWHILE =
  'Quelqu’un d’autre vient de modifier ceci. Rechargez la page avant de recommencer.'

/** What the contributor reads when a command does not say which value was taken */
export const VALUE_TAKEN = 'Cette valeur est déjà prise par un autre élément.'

export type CommandFailure =
  | Rejected
  | NotFound
  | ConcurrencyError
  | UniqueTaken
  | DatabaseError
  | UnreadableEvent

/**
 * Names the field and the message of a value taken meanwhile: the command
 * checked it before its transaction, a projection refused it in there.
 */
export const uniqueTakenAs =
  (field: string, message: string) =>
  <A, E>(command: Effect.Effect<A, E>): Effect.Effect<A, Exclude<E, UniqueTaken> | Rejected> =>
    Effect.mapError(command, (failure) =>
      isUniqueTaken(failure) ? new Rejected(message, field) : (failure as Exclude<E, UniqueTaken>),
    )

const isUniqueTaken = (failure: unknown): failure is UniqueTaken =>
  typeof failure === 'object' && failure !== null && (failure as UniqueTaken)._tag === 'UniqueTaken'

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
    case 'NotFound':
      return failure.message
    case 'ConcurrencyError':
      return EDITED_MEANWHILE
    case 'UniqueTaken':
      return VALUE_TAKEN
    default:
      throw failure
  }
}
