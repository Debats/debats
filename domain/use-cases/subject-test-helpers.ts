import { Effect } from 'effect'
import { createPosition, createSubject } from '../entities/entity-test-helpers'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { positionAdded, subjectAdded, subjectStream } from '../aggregates/subject'
import { SubjectEvent } from '../aggregates/subject-events'
import { inMemoryUnitOfWork } from '../events/event-store-memory'

export const sampleSubject = (title = 'Le montant du SMIC'): Subject =>
  createSubject({
    title,
    presentation: 'Une présentation suffisamment longue pour être valide.',
    problem: 'Faut-il augmenter le SMIC ?',
    createdBy: 'founder',
  })

export const samplePosition = (subjectId: string, title = 'Pour une hausse'): Position =>
  createPosition({
    title,
    description: 'Une description suffisamment longue pour être valide.',
    subjectId,
    createdBy: 'founder',
  })

/** The events a subject's stream holds: the subject, then each of its positions */
export const subjectEvents = (subject: Subject, positions: readonly Position[]): SubjectEvent[] => [
  subjectAdded(subject),
  ...positions.map((p) =>
    positionAdded({ positionId: p.id, title: p.title, description: p.description }),
  ),
]

/** An in-memory journal where these subjects already have their streams, positions included */
export async function journalWithSubjects(...subjects: Array<[Subject, Position[]]>) {
  const unit = inMemoryUnitOfWork()
  for (const [subject, positions] of subjects) {
    await Effect.runPromise(
      unit.journal.append(subjectStream(subject.id), 0, subjectEvents(subject, positions), {
        actorId: subject.createdBy ?? null,
      }),
    )
  }
  return unit
}
