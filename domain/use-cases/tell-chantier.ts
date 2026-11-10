import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { chantierOpen, sessionOf } from './chantier-preconditions'
import { allowedTo, decoded } from './preconditions'
import { ContributorIdentity } from './types'

const TellChantierInput = S.Struct({
  text: S.Trim.pipe(S.minLength(1)),
})

type TellChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
  text: string
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A person writes to the agent of a chantier. The message goes to the
 * session first: one the session refuses is not mirrored, so the
 * conversation on the site never claims more than the agent heard.
 */
export function tellChantierUseCase(params: TellChantierParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'écrire à un chantier'),
      input: decoded(TellChantierInput)({ text: params.text }),
      chantier: chantierOpen(params.chantierId),
    }),
    Effect.flatMap(({ contributor, input, chantier }) =>
      pipe(
        sessionOf(chantier),
        Effect.flatMap((sessionId) => agent.tell(sessionId, input.text)),
        Effect.flatMap(() =>
          chantiers.addMessages(chantier.id, [{ role: 'person', text: input.text, eventId: null }]),
        ),
        Effect.flatMap((messages) =>
          pipe(
            chantiers.update(chantier.id, { status: 'working' }, contributor.id),
            Effect.map((updated) => ({ chantier: updated ?? chantier, messages })),
          ),
        ),
      ),
    ),
  )
}
