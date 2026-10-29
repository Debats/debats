import { Effect, Either, pipe } from 'effect'
import { findPosition, mergePosition } from '../aggregates/subject'
import { moveStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStream, ensureStreams } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'
import { decideOnEachStatement, statementAggregate, StatementSource } from './statement-stream'

type MergePositionsParams = {
  sourcePositionId: string
  targetPositionId: string
  contributor: ContributorIdentity | null
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  statementSource: StatementSource
  /** Read side: which subject the positions belong to, and which statements stand on the source */
  positionRepo: PositionRepository
  statementRepo: StatementRepository
}

/**
 * The source position disappears into the target. The subject records the
 * merge; every statement on the source records its own move, so that each
 * stream stays the whole truth of its projection. The statements to move
 * are read before the transaction: one added in between would stay behind.
 */
export function mergePositions(params: MergePositionsParams): Promise<Either.Either<void, string>> {
  const { sourcePositionId, targetPositionId, runUnitOfWork, subjectSource, statementSource } =
    params
  const { positionRepo, statementRepo } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'admin', 'fusionner des positions'),
      Effect.filterOrFail(
        () => sourcePositionId !== targetPositionId,
        () => new Rejected('Les deux positions sont identiques.'),
      ),
      Effect.bindTo('contributor'),
      Effect.bind('source', () =>
        Effect.flatMap(
          positionRepo.findById(sourcePositionId),
          found('La position source est introuvable.'),
        ),
      ),
      Effect.bind('target', () =>
        Effect.flatMap(
          positionRepo.findById(targetPositionId),
          found('La position cible est introuvable.'),
        ),
      ),
      Effect.filterOrFail(
        ({ source, target }) => source.subjectId === target.subjectId,
        () => new Rejected('Les deux positions doivent appartenir au même sujet.'),
      ),
      Effect.bind('statementIds', () =>
        Effect.map(statementRepo.findByPositionId(sourcePositionId), (statements) =>
          statements.map((s) => s.id),
        ),
      ),
      Effect.tap(({ source, statementIds }) =>
        pipe(
          ensureStream(subjectAggregate, runUnitOfWork, source.subjectId, subjectSource),
          Effect.andThen(
            ensureStreams(statementAggregate, runUnitOfWork, statementIds, statementSource),
          ),
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
    ),
  )
}
