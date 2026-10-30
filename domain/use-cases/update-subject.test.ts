import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { updateSubjectUseCase } from './update-subject'
import { EDITED_MEANWHILE } from './run-command'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runWith } from './command-test-helpers'
import { journalWithSubjects, samplePosition, sampleSubject } from './subject-test-helpers'

const subject = sampleSubject()
const position = samplePosition(subject.id)

const validParams = {
  subjectId: subject.id,
  title: 'Le SMIC',
  presentation: 'Une présentation revue, suffisamment longue.',
  problem: 'Faut-il augmenter le SMIC ?',
  revision: 0,
}

const execute = runWith(Layer.empty)

describe('updateSubjectUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await execute(updateSubjectUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await execute(
      updateSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when subject does not exist', async () => {
    const result = await execute(
      updateSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        subjectId: 'missing',
      }),
    )
    expect(result).toEqual(Either.left('Sujet introuvable.'))
  })

  it('should fail when title is invalid', async () => {
    const result = await execute(
      updateSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        title: 'Ab',
      }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should update subject and award reputation on success', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])

    const result = await execute(
      updateSubjectUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
      run,
    )

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

  it('accepts a form rendered from the revision the stream stands at', async () => {
    const { run } = await journalWithSubjects([subject, [position]])

    const result = await execute(
      updateSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        revision: 2,
      }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
  })

  it('refuses a form rendered before someone else edited, minutes ago or not', async () => {
    const { run, journal } = await journalWithSubjects([subject, [position]])

    const result = await execute(
      updateSubjectUseCase({
        ...validParams,
        contributor: { id: 'abc', reputation: 10000 },
        revision: 1,
      }),
      run,
    )

    expect(result).toEqual(Either.left(EDITED_MEANWHILE))
    expect(journal.all().map((e) => e.type)).toEqual(['SubjectAdded', 'PositionAdded'])
  })
})
