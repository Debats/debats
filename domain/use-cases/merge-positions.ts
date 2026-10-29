import { Effect, pipe } from 'effect'
import { findPosition, mergePosition } from '../aggregates/subject'
import { moveStatement } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream, ensureStreams } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { decideOnSubject, subjectAggregate } from './subject-stream'
import { decideOnEachStatement, statementAggregate } from './statement-stream'

type MergePositionsParams = {
  sourcePositionId: string
  targetPositionId: string
  contributor: ContributorIdentity | null
}

/** Read side: which subject the positions belong to, and which statements stand on the source */
const positions = Effect.serviceFunctions(PositionRepository)
const statements = Effect.serviceFunctions(StatementRepository)

/**
 * The source position disappears into the target. The subject records the
 * merge; every statement on the source records its own move, so that each
 * stream stays the whole truth of its projection. The statements to move
 * are read before the transaction: one added in between would stay behind.
 */
export function mergePositions(params: MergePositionsParams) {
  const { sourcePositionId, targetPositionId } = params

  return pipe(
    allowedTo(params.contributor, 'admin', 'fusionner des positions'),
    Effect.filterOrFail(
      () => sourcePositionId !== targetPositionId,
      () => new Rejected('Les deux positions sont identiques.'),
    ),
    Effect.bindTo('contributor'),
    Effect.bind('source', () =>
      Effect.flatMap(
        positions.findById(sourcePositionId),
        found('La position source est introuvable.'),
      ),
    ),
    Effect.bind('target', () =>
      Effect.flatMap(
        positions.findById(targetPositionId),
        found('La position cible est introuvable.'),
      ),
    ),
    Effect.filterOrFail(
      ({ source, target }) => source.subjectId === target.subjectId,
      () => new Rejected('Les deux positions doivent appartenir au même sujet.'),
    ),
    Effect.bind('statementIds', () =>
      Effect.map(statements.findByPositionId(sourcePositionId), (onSource) =>
        onSource.map((s) => s.id),
      ),
    ),
    Effect.tap(({ source, statementIds }) =>
      pipe(
        ensureStream(subjectAggregate, source.subjectId),
        Effect.andThen(ensureStreams(statementAggregate, statementIds)),
      ),
    ),
    Effect.flatMap(({ contributor, source, statementIds }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(events, source.subjectId, contributor.id, (state) =>
            findPosition(state, sourcePositionId) && findPosition(state, targetPositionId)
              ? Effect.succeed([mergePosition(sourcePositionId, targetPositionId)])
              : Effect.fail(new Rejected('Une des deux positions n’existe plus.')),
          ),
          Effect.andThen(
            decideOnEachStatement(events, statementIds, contributor.id, () => [
              moveStatement(targetPositionId),
            ]),
          ),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
