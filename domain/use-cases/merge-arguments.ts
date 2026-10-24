import { Effect, Either, pipe } from 'effect'
import { Argument } from '../entities/argument'
import { isLiveArgument, mergeArgumentInto, replayArgument } from '../aggregates/argument'
import { setStatementArguments, withArgumentReplaced } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { StatementRepository } from '../repositories/statement-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, Rejected } from './types'
import { ensureStreams } from './aggregate-stream'
import { runCommand } from './run-command'
import {
  argumentAggregate,
  ArgumentSource,
  decideOnArgument,
  loadArgument,
  requireArgumentState,
} from './argument-stream'
import { decideOnEachStatement, statementAggregate, StatementSource } from './statement-stream'

type MergeArgumentsParams = {
  contributor: ContributorIdentity | null
  sourceArgumentId: string
  targetArgumentId: string
  runUnitOfWork: RunUnitOfWork
  argumentSource: ArgumentSource
  statementSource: StatementSource
  /** Read side: which statements mobilise the source */
  statementRepo: StatementRepository
}

const GONE = 'Un des deux arguments n’existe plus.'

/**
 * Folds a duplicate into the argument that should remain: the source records
 * where it went, and every statement that mobilised it now mobilises the
 * target, each in its own stream, as its own stream says it stands. The
 * statements are read before the transaction: one that would mobilise the
 * source meanwhile keeps it.
 */
export async function mergeArgumentsUseCase(
  params: MergeArgumentsParams,
): Promise<Either.Either<Argument, string>> {
  const { contributor, sourceArgumentId, targetArgumentId, statementRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'delete_argument')) {
    const rank = requiredRank('delete_argument')
    return Either.left(`Vous devez être ${rank} pour fusionner des arguments.`)
  }

  if (sourceArgumentId === targetArgumentId) {
    return Either.left('Un argument ne peut pas être fusionné avec lui-même.')
  }

  const statementIds = await Effect.runPromise(statementRepo.findIdsByArgumentId(sourceArgumentId))

  const { runUnitOfWork, argumentSource, statementSource } = params
  return runCommand(
    pipe(
      ensureStreams(
        argumentAggregate,
        runUnitOfWork,
        [targetArgumentId, sourceArgumentId],
        argumentSource,
      ),
      Effect.andThen(
        ensureStreams(statementAggregate, runUnitOfWork, statementIds, statementSource),
      ),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            loadArgument(events, targetArgumentId),
            Effect.flatMap(replayArgument),
            Effect.flatMap(requireArgumentState),
            Effect.filterOrFail(isLiveArgument, () => new Rejected(GONE)),
            Effect.tap(() =>
              decideOnArgument(events, sourceArgumentId, contributor.id, () =>
                Effect.succeed([mergeArgumentInto(targetArgumentId)]),
              ),
            ),
            Effect.tap(() =>
              decideOnEachStatement(events, statementIds, contributor.id, (s) =>
                s.argumentIds.includes(sourceArgumentId)
                  ? [
                      setStatementArguments(
                        withArgumentReplaced(s.argumentIds, sourceArgumentId, targetArgumentId),
                      ),
                    ]
                  : [],
              ),
            ),
            Effect.map((target) => target.argument),
          ),
        ),
      ),
    ),
  )
}
