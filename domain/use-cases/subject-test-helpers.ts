import { Effect } from 'effect'
import { createPosition, createSubject } from '../entities/entity-test-helpers'
import { Position } from '../entities/position'
import { Subject } from '../entities/subject'
import { positionAdded, subjectAdded, subjectStream } from '../aggregates/subject'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { StatementParts, StatementSource } from './statement-stream'
import { SubjectParts, SubjectSource } from './subject-stream'

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

/** What the tables would hold of these subjects, for an import on demand */
export function fakeSubjectSource(parts: SubjectParts[]): SubjectSource {
  return (subjectId) => Effect.succeed(parts.find((p) => p.subject.id === subjectId) ?? null)
}

export const subjectParts = (subject: Subject, positions: Position[] = []): SubjectParts => ({
  subject,
  positions,
  themes: [],
  relatedSubjectIds: [],
})

export function fakeStatementSource(parts: StatementParts[]): StatementSource {
  return (statementId) => Effect.succeed(parts.find((p) => p.statement.id === statementId) ?? null)
}

/** An in-memory journal where these subjects already have their streams, positions included */
export async function journalWithSubjects(...subjects: Array<[Subject, Position[]]>) {
  const unit = inMemoryUnitOfWork()
  for (const [subject, positions] of subjects) {
    await Effect.runPromise(
      unit.journal.append(
        subjectStream(subject.id),
        0,
        [
          subjectAdded(subject),
          ...positions.map((p) =>
            positionAdded({ positionId: p.id, title: p.title, description: p.description }),
          ),
        ],
        { actorId: subject.createdBy ?? null },
      ),
    )
  }
  return unit
}
