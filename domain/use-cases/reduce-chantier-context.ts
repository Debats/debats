import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { handoverOf } from '../services/chantier-context'
import { chantierOpen, sessionOf } from './chantier-preconditions'
import { allowedTo } from './preconditions'
import { ContributorIdentity, Rejected } from './types'

type ReduceChantierContextParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

export const AGENT_AT_WORK =
  'L’agent travaille : attendez qu’il ait fini pour réduire son contexte, ce qu’il fait serait perdu.'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const drafts = Effect.serviceFunctions(DraftStatementRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * A person reduces the context of the agent of a chantier: the agent
 * carries on in a new session, told what the thread said so far, without
 * the pages and the outputs the session before had piled up and read again
 * at every step. The drafts, the thread, the notebook of sources and the
 * reviews kept for the agent are the site's and stay as they are.
 *
 * The session left behind is not erased: what the agent read there stays in
 * the console, and what it spent is added to what the chantier spent before.
 * It goes with the chantier, when the chantier is deleted. The new session
 * is opened first: one that cannot be leaves the chantier on the session it
 * had.
 */
export function reduceChantierContextUseCase(params: ReduceChantierContextParams) {
  const reopened = (chantier: Chantier, sessionId: string, contributorId: string) =>
    pipe(
      Effect.all({
        held: drafts.findByChantier(chantier.id),
        thread: chantiers.findMessages(chantier.id),
        noted: chantiers.findSources(chantier.id),
        left: agent.spend(sessionId),
      }),
      Effect.flatMap(({ held, thread, noted, left }) =>
        pipe(
          agent.reopen({
            id: chantier.id,
            brief: chantier.brief,
            title: chantier.title,
            existingDrafts: held.length,
            handover: handoverOf(thread),
            notedSources: noted.length,
          }),
          Effect.flatMap((session) =>
            pipe(
              chantiers.update(
                chantier.id,
                {
                  sessionId: session.sessionId,
                  status: 'working',
                  lastEventAt: null,
                  contextTokens: null,
                  earlierSpentCents: chantier.earlierSpentCents + (left.spend?.spentCents ?? 0),
                  pastSessionIds: [...chantier.pastSessionIds, sessionId],
                },
                contributorId,
              ),
              /* The chantier could not be moved: the session just opened is erased rather than left running unseen. Were that to fail too, the adapter has reported it */
              Effect.tapError(() => Effect.ignore(agent.forget(session.sessionId))),
            ),
          ),
        ),
      ),
      Effect.map((updated) => updated ?? chantier),
    )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'réduire le contexte d’un chantier'),
      chantier: chantierOpen(params.chantierId),
    }),
    Effect.filterOrFail(
      ({ chantier }) => chantier.status !== 'working',
      () => new Rejected(AGENT_AT_WORK),
    ),
    Effect.flatMap(({ contributor, chantier }) =>
      Effect.flatMap(sessionOf(chantier), (sessionId) =>
        reopened(chantier, sessionId, contributor.id),
      ),
    ),
  )
}
