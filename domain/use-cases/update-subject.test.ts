import { describe, it, expect } from 'vitest'
import { Either, Effect } from 'effect'
import { updateSubjectUseCase } from './update-subject'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  fakeSubjectSource,
  journalWithSubjects,
  samplePosition,
  sampleSubject,
  subjectParts,
} from './subject-test-helpers'

const subject = sampleSubject()
const position = samplePosition(subject.id)

const validParams = {
  subjectId: subject.id,
  title: 'Le SMIC',
  presentation: 'Une présentation revue, suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
  runUnitOfWork: inMemoryUnitOfWork().run,
  subjectSource: fakeSubjectSource([subjectParts(subject, [position])]),
}

describe('updateSubjectUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await updateSubjectUseCase({ ...validParams, contributor: null })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when subject does not exist', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      subjectId: 'missing',
    })
    expect(result).toEqual(Either.left('Sujet introuvable.'))
  })

  it('should fail when title is invalid', async () => {
    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      title: 'Ab',
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update subject and award reputation on success', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])

    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      runUnitOfWork: run,
    })

    expect(Either.isRight(result) && result.right).toMatchObject({
      id: subject.id,
      title: 'Le SMIC',
      slug: 'le-smic',
      createdBy: 'founder',
    })
    expect(deedsIn(journal).at(-1)).toMatchObject({
      type: 'SubjectEdited',
      revision: 3,
      actorId: 'abc',
    })
    expect(grantsIn(journal)).toEqual([['abc', 'edited_subject', 5]])
  })

  it('should import a subject that has no stream yet, positions included, before editing it', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await updateSubjectUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 10000 },
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(journal).map((e) => [e.revision, e.type, e.actorId, e.metadata.source])).toEqual(
      [
        [1, 'SubjectImported', 'founder', 'import'],
        [2, 'PositionImported', 'founder', 'import'],
        [3, 'SubjectEdited', 'abc', undefined],
      ],
    )
    expect(journal.all()[0].occurredAt).toEqual(subject.createdAt)
    expect(journal.all()[1].payload).toMatchObject({ positionId: position.id, slug: position.slug })
  })
})
