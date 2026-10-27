import { Either, Effect, pipe } from 'effect'
import { linkSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity, Rejected } from './types'
import { ensureStreams } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

type LinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

/** A link is symmetric: each subject records it in its own stream, in one transaction */
export function linkSubjectsUseCase(
  params: LinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { subjectId1, subjectId2, runUnitOfWork, subjectSource } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'link_subjects', 'lier des sujets'),
      Effect.filterOrFail(
        () => subjectId1 !== subjectId2,
        () => new Rejected('Impossible de lier un sujet au même sujet.'),
      ),
      Effect.tap(() =>
        ensureStreams(subjectAggregate, runUnitOfWork, [subjectId1, subjectId2], subjectSource),
      ),
      Effect.flatMap((contributor) =>
        runUnitOfWork((events) =>
          pipe(
            recordLink(events, subjectId1, subjectId2, contributor.id),
            Effect.andThen(recordLink(events, subjectId2, subjectId1, contributor.id)),
          ),
        ),
      ),
      Effect.asVoid,
    ),
  )
}

function recordLink(events: EventStore, subjectId: string, otherId: string, actorId: string) {
  return decideOnSubject(events, subjectId, actorId, () => Effect.succeed([linkSubject(otherId)]))
}
