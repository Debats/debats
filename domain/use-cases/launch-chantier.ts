import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { allowedTo, decoded } from './preconditions'
import { ContributorIdentity } from './types'

const BRIEF_MIN = 10

const LaunchChantierInput = S.Struct({
  brief: S.Trim.pipe(S.minLength(BRIEF_MIN)),
})

type LaunchChantierParams = {
  contributor: ContributorIdentity | null
  brief: string
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * Opens a chantier on a brief: the row first, so the agent is told which
 * chantier its drafts belong to, then the session. A session that cannot be
 * opened leaves the chantier ended, with the failure told to the person.
 */
export function launchChantierUseCase(params: LaunchChantierParams) {
  const start = (chantier: Chantier, contributorId: string) =>
    pipe(
      agent.open({
        id: chantier.id,
        brief: chantier.brief,
        title: null,
        existingDrafts: 0,
        recap: null,
      }),
      Effect.matchEffect({
        onFailure: (failure) =>
          pipe(
            chantiers.update(chantier.id, { status: 'ended' }, contributorId),
            Effect.flatMap(() => Effect.fail(failure)),
          ),
        onSuccess: ({ sessionId }) =>
          chantiers.update(chantier.id, { sessionId, status: 'working' }, contributorId),
      }),
      /* The row was just written: nothing else could have taken it away */
      Effect.map((updated) => updated ?? chantier),
    )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'lancer un chantier'),
      input: decoded(LaunchChantierInput)({ brief: params.brief }),
    }),
    Effect.flatMap(({ contributor, input }) =>
      pipe(
        chantiers.create({ brief: input.brief, createdBy: contributor.id }),
        Effect.flatMap((chantier) => start(chantier, contributor.id)),
      ),
    ),
  )
}
