import { Effect, Either, pipe } from 'effect'
import { Argument } from '../entities/argument'
import { absorbArgument, mergeArgumentInto } from '../aggregates/argument'
import { setStatementArguments, withArgumentReplaced } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStreams } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { runCommand } from './run-command'
import { argumentAggregate, ArgumentSource, decideOnArgument } from './argument-stream'
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
 * Folds a duplicate into the argument that should remain: the target records
 * what it absorbed, the source where it went, and every statement that
 * mobilised the source now mobilises the target, each in its own stream, as
 * its own stream says it stands. The statements are read before the
 * transaction: one that would mobilise the source meanwhile keeps it.
 */
export function mergeArgumentsUseCase(
  params: MergeArgumentsParams,
): Promise<Either.Either<Argument, string>> {
  const { sourceArgumentId, targetArgumentId, runUnitOfWork } = params
  const { argumentSource, statementSource, statementRepo } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'delete_argument', 'fusionner des arguments'),
      Effect.filterOrFail(
        () => sourceArgumentId !== targetArgumentId,
        () => new Rejected('Un argument ne peut pas être fusionné avec lui-même.'),
      ),
      Effect.bindTo('contributor'),
      Effect.bind('statementIds', () => statementRepo.findIdsByArgumentId(sourceArgumentId)),
      Effect.tap(({ statementIds }) =>
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
        ),
      ),
      Effect.flatMap(({ contributor, statementIds }) =>
        runUnitOfWork((events) =>
          pipe(
            // The target writes too, at its revision: a merge crossing this one cannot also commit
            decideOnArgument(events, targetArgumentId, contributor.id, () =>
              Effect.succeed([absorbArgument(sourceArgumentId)]),
            ),
            Effect.catchTag('NotFound', () => Effect.fail(new Rejected(GONE))),
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
            Effect.map(({ state }) => state.argument),
          ),
        ),
      ),
    ),
  )
}
