import { Effect, pipe } from 'effect'
import { absorbArgument, mergeArgumentInto } from '../aggregates/argument'
import { replaceArgument } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity, Rejected } from './types'
import { ensureStreams } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { argumentAggregate, decideOnArgument } from './argument-stream'
import { decideOnEachStatement, statementAggregate } from './statement-stream'

type MergeArgumentsParams = {
  contributor: ContributorIdentity | null
  sourceArgumentId: string
  targetArgumentId: string
}

const GONE = 'Un des deux arguments n’existe plus.'

/** Read side: which statements mobilise the source */
const statements = Effect.serviceFunctions(StatementRepository)

/**
 * Folds a duplicate into the argument that should remain: the target records
 * what it absorbed, the source where it went, and every statement that
 * mobilised the source now mobilises the target, each in its own stream, as
 * its own stream says it stands. The statements are read before the
 * transaction: one that would mobilise the source meanwhile keeps it.
 */
export function mergeArgumentsUseCase(params: MergeArgumentsParams) {
  const { sourceArgumentId, targetArgumentId } = params

  return pipe(
    allowedTo(params.contributor, 'delete_argument', 'fusionner des arguments'),
    Effect.filterOrFail(
      () => sourceArgumentId !== targetArgumentId,
      () => new Rejected('Un argument ne peut pas être fusionné avec lui-même.'),
    ),
    Effect.bindTo('contributor'),
    Effect.bind('statementIds', () => statements.findIdsByArgumentId(sourceArgumentId)),
    Effect.tap(({ statementIds }) =>
      pipe(
        ensureStreams(argumentAggregate, [targetArgumentId, sourceArgumentId]),
        Effect.andThen(ensureStreams(statementAggregate, statementIds)),
      ),
    ),
    Effect.flatMap(({ contributor, statementIds }) =>
      runUnitOfWork((events) =>
        pipe(
          // The target writes too, at its revision: a merge crossing this one cannot also commit
          decideOnArgument(
            events,
            targetArgumentId,
            contributor.id,
            absorbArgument(sourceArgumentId),
          ),
          Effect.catchTag('NotFound', () => Effect.fail(new Rejected(GONE))),
          Effect.tap(() =>
            decideOnArgument(
              events,
              sourceArgumentId,
              contributor.id,
              mergeArgumentInto(targetArgumentId),
            ),
          ),
          Effect.tap(() =>
            decideOnEachStatement(
              events,
              statementIds,
              contributor.id,
              replaceArgument(sourceArgumentId, targetArgumentId),
            ),
          ),
          Effect.map(({ state }) => state.argument),
        ),
      ),
    ),
  )
}
