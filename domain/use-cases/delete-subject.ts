import { Effect, pipe } from 'effect'
import { isMajorSubject } from '../entities/subject'
import { deleteSubject } from '../aggregates/subject'
import { removeStatement } from '../aggregates/statement'
import { runUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { ContributorIdentity } from './types'
import { ensureStream, ensureStreams } from './aggregate-stream'
import { found, mayPerform, signedIn } from './preconditions'
import { decideOnSubject, subjectAggregate } from './subject-stream'
import { decideOnEachStatement, statementAggregate } from './statement-stream'

type DeleteSubjectParams = {
  contributor: ContributorIdentity | null
  subjectId: string
}

/** Read side: how much the subject weighs, and which statements go with it */
const subjects = Effect.serviceFunctions(SubjectRepository)
const statements = Effect.serviceFunctions(StatementRepository)

/**
 * Deleting a subject takes its positions with it (same stream) and every
 * statement on them: each statement records its own deletion in its stream.
 * A major subject takes a higher rank than a minor one.
 */
export function deleteSubjectUseCase(params: DeleteSubjectParams) {
  const { subjectId } = params

  const weight = Effect.all({
    subject: Effect.flatMap(subjects.findById(subjectId), found(subjectAggregate.notFound)),
    stats: subjects.getStats(subjectId),
  })
  const actionFor = ({ subject, stats }: Effect.Effect.Success<typeof weight>) =>
    isMajorSubject(subject, stats.statementsCount)
      ? ('delete_major_subject' as const)
      : ('delete_minor_subject' as const)

  return pipe(
    signedIn(params.contributor),
    Effect.flatMap((contributor) =>
      Effect.flatMap(weight, (read) =>
        mayPerform(actionFor(read), 'supprimer ce sujet')(contributor),
      ),
    ),
    Effect.bindTo('contributor'),
    Effect.bind('statementIds', () => statements.findIdsBySubjectId(subjectId)),
    Effect.tap(({ statementIds }) =>
      pipe(
        ensureStream(subjectAggregate, subjectId),
        Effect.andThen(ensureStreams(statementAggregate, statementIds)),
      ),
    ),
    Effect.flatMap(({ contributor, statementIds }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(events, subjectId, contributor.id, () =>
            Effect.succeed([deleteSubject()]),
          ),
          Effect.andThen(
            decideOnEachStatement(events, statementIds, contributor.id, () => [removeStatement()]),
          ),
        ),
      ),
    ),
    Effect.asVoid,
  )
}
