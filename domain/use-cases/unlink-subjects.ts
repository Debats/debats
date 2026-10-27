import { Either, Effect, pipe } from 'effect'
import { unlinkSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { ensureStreams } from './aggregate-stream'
import { allowedTo } from './preconditions'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

type UnlinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

/** Each subject forgets the other in its own stream, in one transaction */
export function unlinkSubjectsUseCase(
  params: UnlinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { subjectId1, subjectId2, runUnitOfWork, subjectSource } = params

  return runCommand(
    pipe(
      allowedTo(params.contributor, 'link_subjects', 'modifier les liens entre sujets'),
      Effect.tap(() =>
        ensureStreams(subjectAggregate, runUnitOfWork, [subjectId1, subjectId2], subjectSource),
      ),
      Effect.flatMap((contributor) =>
        runUnitOfWork((events) =>
          pipe(
            recordUnlink(events, subjectId1, subjectId2, contributor.id),
            Effect.andThen(recordUnlink(events, subjectId2, subjectId1, contributor.id)),
          ),
        ),
      ),
      Effect.asVoid,
    ),
  )
}

function recordUnlink(events: EventStore, subjectId: string, otherId: string, actorId: string) {
  return decideOnSubject(events, subjectId, actorId, () => Effect.succeed([unlinkSubject(otherId)]))
}
