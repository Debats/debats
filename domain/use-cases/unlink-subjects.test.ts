import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { unlinkSubjectsUseCase } from './unlink-subjects'
import { runWith } from './command-test-helpers'
import { journalWithSubjects, sampleSubject } from './subject-test-helpers'

const smic = sampleSubject('Le montant du SMIC')
const retraites = sampleSubject('Les retraites')

const validParams = {
  subjectId1: smic.id,
  subjectId2: retraites.id,
}

const execute = runWith(Layer.empty)

describe('unlinkSubjectsUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await execute(unlinkSubjectsUseCase({ ...validParams, contributor: null }))
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await execute(
      unlinkSubjectsUseCase({ ...validParams, contributor: { id: 'abc', reputation: 0 } }),
    )
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should record the unlink on both subjects on success', async () => {
    const { run, journal } = await journalWithSubjects([smic, []], [retraites, []])

    const result = await execute(
      unlinkSubjectsUseCase({ ...validParams, contributor: { id: 'abc', reputation: 10000 } }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(
      journal
        .all()
        .slice(-2)
        .map((e) => [e.streamId, e.type, e.payload]),
    ).toEqual([
      [smic.id, 'SubjectUnlinked', { subjectId: retraites.id }],
      [retraites.id, 'SubjectUnlinked', { subjectId: smic.id }],
    ])
  })
})
