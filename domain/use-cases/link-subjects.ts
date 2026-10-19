import { Either, Effect, pipe } from 'effect'
import { linkSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { runCommand } from './run-command'
import { decideOnSubject, SubjectSource } from './subject-stream'

type LinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

/** A link is symmetric: each subject records it in its own stream, in one transaction */
export async function linkSubjectsUseCase(
  params: LinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId1, subjectId2, runUnitOfWork, subjectSource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'link_subjects')) {
    const rank = requiredRank('link_subjects')
    return Either.left(`Vous devez être ${rank} pour lier des sujets.`)
  }

  if (subjectId1 === subjectId2) {
    return Either.left('Impossible de lier un sujet au même sujet.')
  }

  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        recordLink(events, subjectId1, subjectId2, subjectSource, contributor.id),
        Effect.flatMap(() =>
          recordLink(events, subjectId2, subjectId1, subjectSource, contributor.id),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return outcome

  return Either.right(undefined)
}

function recordLink(
  events: EventStore,
  subjectId: string,
  otherId: string,
  source: SubjectSource,
  actorId: string,
) {
  return decideOnSubject(events, subjectId, source, actorId, () =>
    Effect.succeed([linkSubject(otherId)]),
  )
}
