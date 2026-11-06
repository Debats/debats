import { Clock, Effect } from 'effect'

/**
 * The day a command is taken on, read once from the application clock.
 *
 * A command that judges the time reads this in its pipe, before it writes, and
 * hands the day down to whatever decides on it: nothing in the domain reaches
 * for a clock of its own. The transaction then dates the facts it records
 * (`runUnitOfWork`), so a deed and the day it was judged against agree.
 */
export const today: Effect.Effect<Date> = Effect.map(
  Clock.currentTimeMillis,
  (millis) => new Date(millis),
)
