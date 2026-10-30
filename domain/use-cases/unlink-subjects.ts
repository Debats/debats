import { Effect, pipe } from 'effect'
import { unlinkSubject } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { allowedTo } from './preconditions'
import { decideOnSubject, subjectAggregate } from './subject-stream'

type UnlinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
}

/** Each subject forgets the other in its own stream, in one transaction */
export function unlinkSubjectsUseCase(params: UnlinkSubjectsParams) {
  const { subjectId1, subjectId2 } = params

  return pipe(
    allowedTo(params.contributor, 'link_subjects', 'modifier les liens entre sujets'),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        pipe(
          recordUnlink(events, subjectId1, subjectId2, contributor.id),
          Effect.andThen(recordUnlink(events, subjectId2, subjectId1, contributor.id)),
        ),
      ),
    ),
    Effect.asVoid,
  )
}

function recordUnlink(events: EventStore, subjectId: string, otherId: string, actorId: string) {
  return decideOnSubject(events, subjectId, actorId, unlinkSubject(otherId))
}
