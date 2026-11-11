import { Effect, pipe } from 'effect'
import { Chantier } from '../entities/chantier'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { ChantierAgent } from '../services/chantier-agent'
import { chantierFound } from './chantier-preconditions'
import { allowedTo } from './preconditions'
import { ContributorIdentity, Rejected } from './types'

type StartChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

export const ALREADY_STARTED = 'L’agent de ce chantier est déjà lancé.'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const drafts = Effect.serviceFunctions(DraftStatementRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * Launches the agent on an adopted chantier: a session opened on the brief,
 * told how many drafts are already there to read first. A session that
 * cannot be opened leaves the chantier as it was, pending, so the person
 * can try again; the failure is told.
 */
export function startChantierUseCase(params: StartChantierParams) {
  const opened = (chantier: Chantier, contributorId: string) =>
    pipe(
      drafts.findByChantier(chantier.id),
      Effect.flatMap((held) =>
        agent.open({
          id: chantier.id,
          brief: chantier.brief,
          title: chantier.title,
          existingDrafts: held.length,
        }),
      ),
      Effect.flatMap(({ sessionId }) =>
        chantiers.update(chantier.id, { sessionId, status: 'working' }, contributorId),
      ),
      Effect.map((updated) => updated ?? chantier),
    )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'lancer l’agent d’un chantier'),
      chantier: chantierFound(params.chantierId),
    }),
    Effect.filterOrFail(
      ({ chantier }) => chantier.status === 'pending' && chantier.sessionId === null,
      () => new Rejected(ALREADY_STARTED),
    ),
    Effect.flatMap(({ contributor, chantier }) => opened(chantier, contributor.id)),
  )
}
