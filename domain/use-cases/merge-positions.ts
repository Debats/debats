import { Effect, Either, pipe } from 'effect'
import { findPosition, mergePosition } from '../aggregates/subject'
import { moveStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { canPerform } from '../reputation/permissions'
import { ContributorIdentity, Rejected } from './types'
import { runCommand } from './run-command'
import { decideOnSubject, SubjectSource } from './subject-stream'
import { decideOnEachStatement, StatementSource } from './statement-stream'

type MergePositionsParams = {
  sourcePositionId: string
  targetPositionId: string
  contributor: ContributorIdentity
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
export async function mergePositions(
  params: MergePositionsParams,
): Promise<Either.Either<void, string>> {
  const {
    sourcePositionId,
    targetPositionId,
    contributor,
    runUnitOfWork,
    subjectSource,
    statementSource,
    positionRepo,
    statementRepo,
  } = params

  if (sourcePositionId === targetPositionId) {
    return Either.left('Les deux positions sont identiques.')
  }

  if (!canPerform(contributor.reputation, 'admin')) {
    return Either.left('Vous devez être Fondateur pour fusionner des positions.')
  }

  const source = await Effect.runPromise(positionRepo.findById(sourcePositionId))
  if (!source) return Either.left('La position source est introuvable.')

  const target = await Effect.runPromise(positionRepo.findById(targetPositionId))
  if (!target) return Either.left('La position cible est introuvable.')

  if (source.subjectId !== target.subjectId) {
    return Either.left('Les deux positions doivent appartenir au même sujet.')
  }

  const statements = await Effect.runPromise(statementRepo.findByPositionId(sourcePositionId))
  const statementIds = statements.map((s) => s.id)

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        decideOnSubject(events, source.subjectId, subjectSource, contributor.id, (state) =>
          findPosition(state, sourcePositionId) && findPosition(state, targetPositionId)
            ? Effect.succeed([mergePosition(sourcePositionId, targetPositionId)])
            : Effect.fail(new Rejected('Une des deux positions n’existe plus.')),
        ),
        Effect.flatMap(() =>
          decideOnEachStatement(events, statementIds, statementSource, contributor.id, () => [
            moveStatement(targetPositionId),
          ]),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return outcome

  return Either.right(undefined)
}
