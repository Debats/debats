import { Effect, pipe } from 'effect'
import { Chantier, ChantierMessageRole } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { sessionOf } from './chantier-preconditions'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/** What separates the lines told in one message: a blank line, as between paragraphs */
const BETWEEN_LINES = '\n\n'

/**
 * Lines delivered to the agent of a chantier in one message, then kept in
 * its thread one by one. The session hears them first: lines the session
 * refuses are not mirrored, so the conversation on the site never claims
 * more than the agent heard. The agent is then at work on them, whatever it
 * was doing.
 */
const delivered = (
  chantier: Chantier,
  role: ChantierMessageRole,
  lines: readonly string[],
  by: string,
) =>
  pipe(
    sessionOf(chantier),
    Effect.flatMap((sessionId) => agent.tell(sessionId, lines.join(BETWEEN_LINES))),
    Effect.flatMap(() =>
      chantiers.addMessages(
        chantier.id,
        lines.map((text) => ({ role, text, eventId: null })),
      ),
    ),
    Effect.flatMap((messages) =>
      pipe(
        chantiers.update(chantier.id, { status: 'working' }, by),
        Effect.map((updated) => ({ chantier: updated ?? chantier, messages })),
      ),
    ),
  )

/** A line delivered to the agent of a chantier, then kept in its thread */
export const deliveredToChantier = (
  chantier: Chantier,
  role: ChantierMessageRole,
  text: string,
  by: string,
) => delivered(chantier, role, [text], by)

/**
 * The review notices kept for the agent, the oldest first, all in one
 * message; null when there is nothing to tell. What was kept is let go of
 * once the session has heard it. Were the site to stop between the two, the
 * agent would hear those notices once more: twice rather than never.
 */
export function reviewsDelivered(chantier: Chantier, by: string) {
  return Effect.flatMap(chantiers.findUnheard(chantier.id), (unheard) => {
    if (unheard.length === 0) return Effect.succeed(null)
    return Effect.tap(
      delivered(
        chantier,
        'review',
        unheard.map(({ text }) => text),
        by,
      ),
      () => chantiers.forgetUnheard(unheard.map(({ id }) => id)),
    )
  })
}
