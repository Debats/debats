import { Either, Effect, pipe } from 'effect'
import { unlinkSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { ensureStreams } from './aggregate-stream'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

type UnlinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

export async function unlinkSubjectsUseCase(
  params: UnlinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId1, subjectId2, runUnitOfWork, subjectSource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'link_subjects')) {
    const rank = requiredRank('link_subjects')
    return Either.left(`Vous devez être ${rank} pour modifier les liens entre sujets.`)
  }

  const outcome = await runCommand(
    pipe(
      ensureStreams(subjectAggregate, runUnitOfWork, [subjectId1, subjectId2], subjectSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            recordUnlink(events, subjectId1, subjectId2, contributor.id),
            Effect.flatMap(() => recordUnlink(events, subjectId2, subjectId1, contributor.id)),
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return outcome

  return Either.right(undefined)
}

function recordUnlink(events: EventStore, subjectId: string, otherId: string, actorId: string) {
  return decideOnSubject(events, subjectId, actorId, () => Effect.succeed([unlinkSubject(otherId)]))
}
