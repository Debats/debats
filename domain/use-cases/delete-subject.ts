import { Either, Effect, pipe } from 'effect'
import { isMajorSubject } from '../entities/subject'
import { deleteSubject } from '../aggregates/subject'
import { removeStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity } from './types'
import { ensureStream, ensureStreams } from './aggregate-stream'
import { found, mayPerform, signedIn } from './preconditions'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'
import { decideOnEachStatement, statementAggregate, StatementSource } from './statement-stream'

type DeleteSubjectParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  statementSource: StatementSource
  /** Read side: how much the subject weighs, and which statements go with it */
  subjectRepo: SubjectRepository
  statementRepo: StatementRepository
}

/**
 * Deleting a subject takes its positions with it (same stream) and every
 * statement on them: each statement records its own deletion in its stream.
 * A major subject takes a higher rank than a minor one.
 */
export function deleteSubjectUseCase(
  params: DeleteSubjectParams,
): Promise<Either.Either<void, string>> {
  const { subjectId, runUnitOfWork, subjectSource, statementSource, subjectRepo } = params

  const weight = Effect.all({
    subject: Effect.flatMap(subjectRepo.findById(subjectId), found(subjectAggregate.notFound)),
    stats: subjectRepo.getStats(subjectId),
  })
  const actionFor = ({ subject, stats }: Effect.Effect.Success<typeof weight>) =>
    isMajorSubject(subject, stats.statementsCount)
      ? ('delete_major_subject' as const)
      : ('delete_minor_subject' as const)

  return runCommand(
    pipe(
      signedIn(params.contributor),
      Effect.flatMap((contributor) =>
        Effect.flatMap(weight, (read) =>
          mayPerform(actionFor(read), 'supprimer ce sujet')(contributor),
        ),
      ),
      Effect.bindTo('contributor'),
      Effect.bind('statementIds', () => params.statementRepo.findIdsBySubjectId(subjectId)),
      Effect.tap(({ statementIds }) =>
        pipe(
          ensureStream(subjectAggregate, runUnitOfWork, subjectId, subjectSource),
          Effect.andThen(
            ensureStreams(statementAggregate, runUnitOfWork, statementIds, statementSource),
          ),
        ),
      ),
      Effect.flatMap(({ contributor, statementIds }) =>
        runUnitOfWork((events) =>
          pipe(
            decideOnSubject(events, subjectId, contributor.id, () =>
              Effect.succeed([deleteSubject()]),
            ),
            Effect.andThen(
              decideOnEachStatement(events, statementIds, contributor.id, () => [
                removeStatement(),
              ]),
            ),
          ),
        ),
      ),
    ),
  )
}
