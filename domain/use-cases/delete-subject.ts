import { Either, Effect, pipe } from 'effect'
import { isMajorSubject } from '../entities/subject'
import { deleteSubject } from '../aggregates/subject'
import { removeStatement } from '../aggregates/statement'
import { RunUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { StatementRepository } from '../repositories/statement-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { runCommand } from './run-command'
import { decideOnSubject, SubjectSource } from './subject-stream'
import { decideOnEachStatement, StatementSource } from './statement-stream'

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
 */
export async function deleteSubjectUseCase(
  params: DeleteSubjectParams,
): Promise<Either.Either<void, string>> {
  const {
    contributor,
    subjectId,
    runUnitOfWork,
    subjectSource,
    statementSource,
    subjectRepo,
    statementRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
  if (!subject) {
    return Either.left('Sujet introuvable.')
  }

  const stats = await Effect.runPromise(subjectRepo.getStats(subjectId))
  const isMajor = isMajorSubject(subject, stats.statementsCount)
  const action = isMajor ? ('delete_major_subject' as const) : ('delete_minor_subject' as const)

  if (!canPerform(contributor.reputation, action)) {
    const rank = requiredRank(action)
    return Either.left(`Vous devez être ${rank} pour supprimer ce sujet.`)
  }

  const statementIds = await Effect.runPromise(statementRepo.findIdsBySubjectId(subjectId))

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        decideOnSubject(events, subjectId, subjectSource, contributor.id, () =>
          Effect.succeed([deleteSubject()]),
        ),
        Effect.flatMap(() =>
          decideOnEachStatement(events, statementIds, statementSource, contributor.id, () => [
            removeStatement(),
          ]),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return outcome

  return Either.right(undefined)
}
