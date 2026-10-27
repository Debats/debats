import { Effect, Either, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter, ParseError } from 'effect/ParseResult'
import { Action, canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors, Invalid, Rejected } from './types'

/**
 * What a command checks before it touches the journal: who asks, whether
 * they may, whether the form holds up, what the read side must or must not
 * find. Each check is a step of the command's pipe and refuses with a
 * Rejected, or an Invalid for a form at fault on several fields.
 */

export const SIGN_IN = 'Vous devez être connecté·e.'

export const INVALID_FORM = 'Données invalides. Vérifiez les champs du formulaire.'

/** The command comes from a contributor who is signed in */
export const signedIn = (
  contributor: ContributorIdentity | null,
): Effect.Effect<ContributorIdentity, Rejected> =>
  contributor ? Effect.succeed(contributor) : Effect.fail(new Rejected(SIGN_IN))

/**
 * The contributor is of the rank the action takes; otherwise told which one
 * it takes « pour modifier un sujet ». For a rank that depends on what the
 * command read first: the contributor is already known.
 */
export const mayPerform =
  (action: Action, what: string) =>
  (contributor: ContributorIdentity): Effect.Effect<ContributorIdentity, Rejected> =>
    canPerform(contributor.reputation, action)
      ? Effect.succeed(contributor)
      : Effect.fail(new Rejected(`Vous devez être ${requiredRank(action)} pour ${what}.`))

/** Signed in, and of the rank the action takes */
export const allowedTo = (
  contributor: ContributorIdentity | null,
  action: Action,
  what: string,
): Effect.Effect<ContributorIdentity, Rejected> =>
  pipe(signedIn(contributor), Effect.flatMap(mayPerform(action, what)))

/** The input decoded by its schema, or one message for the whole form */
export const decoded =
  <A, I>(schema: S.Schema<A, I>) =>
  (input: unknown): Effect.Effect<A, Rejected> =>
    Effect.mapError(S.decodeUnknown(schema)(input), () => new Rejected(INVALID_FORM))

/**
 * The form's input decoded by its schema. Each field at fault is named with
 * the message the form shows under it; a fault on a field the messages do
 * not name is one message for the whole form.
 */
export const fieldsOf =
  <A, I>(schema: S.Schema<A, I>, messages: Record<string, string>) =>
  (input: unknown): Effect.Effect<A, Invalid | Rejected> =>
    Effect.mapError(S.decodeUnknown(schema, { errors: 'all' })(input), (error) => {
      const faults = faultsIn(error, messages)
      return Object.keys(faults).length > 0 ? new Invalid(faults) : new Rejected(INVALID_FORM)
    })

/**
 * The fields of the input a schema finds at fault, named with the messages
 * of the form, for a form that gathers faults from more than one check
 * before refusing. Empty when the input holds up.
 */
export const faultsOf =
  <A, I>(schema: S.Schema<A, I>, messages: Record<string, string>) =>
  (input: unknown): FieldErrors =>
    Either.match(S.decodeUnknownEither(schema, { errors: 'all' })(input), {
      onLeft: (error) => faultsIn(error, messages),
      onRight: () => ({}),
    })

/** A form refused on the faults gathered, or nothing to say */
export const faultless = (faults: FieldErrors): Effect.Effect<void, Invalid> =>
  Object.keys(faults).length > 0 ? Effect.fail(new Invalid(faults)) : Effect.void

function faultsIn(error: ParseError, messages: Record<string, string>): FieldErrors {
  const faults: FieldErrors = {}
  for (const issue of ArrayFormatter.formatErrorSync(error)) {
    const field = issue.path.join('.')
    if (messages[field]) faults[field] = messages[field]
  }
  return faults
}

/** What the read side must find: nothing is refused with the message, on the field if one is to blame */
export const found =
  (message: string, field?: string) =>
  <A>(value: A | null | undefined): Effect.Effect<A, Rejected> =>
    value ? Effect.succeed(value) : Effect.fail(new Rejected(message, field))

/** What the read side must not find: a value already there is refused, on the field that holds it */
export const free =
  (message: string, field?: string) =>
  (value: unknown): Effect.Effect<void, Rejected> =>
    value ? Effect.fail(new Rejected(message, field)) : Effect.void
