import { Either } from 'effect'

/**
 * A command refused by the aggregate while it ran against the journal, with
 * the message for the contributor and, when one field of the form is to
 * blame, which one.
 */
export class Rejected {
  readonly _tag = 'Rejected'
  constructor(
    readonly message: string,
    readonly field?: string,
  ) {}
}

/**
 * The aggregate a command names is unknown to the journal and the tables, or
 * was deleted: refused before any decision, with the aggregate's own message.
 * A command reaching another aggregate can tell this apart from a refusal.
 */
export class NotFound {
  readonly _tag = 'NotFound'
  constructor(readonly message: string) {}
}

/**
 * What an aggregate decides from its state: the facts to record, or why it
 * refuses. A decision is pure: it reads the state its stream replays, never a
 * table, and the command only names it (`editPosition(input)`).
 */
export type Decision<State, Event> = (state: State) => Either.Either<Event[], Rejected>

/**
 * What an aggregate records when something happened elsewhere (its position
 * merged, its subject deleted): it has nothing to refuse, at most nothing to say.
 */
export type Cascade<State, Event> = (state: State) => Event[]

/** A decision the state cannot refuse: the facts follow from the intention alone */
export const always =
  <State, Event>(...events: Event[]): Decision<State, Event> =>
  () =>
    Either.right(events)

/** A decision refused: nothing to record, and the message for the contributor */
export const refused = <Event>(message: string, field?: string): Either.Either<Event[], Rejected> =>
  Either.left(new Rejected(message, field))
