import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { linkSubjectsUseCase } from './link-subjects'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import {
  fakeSubjectSource,
  journalWithSubjects,
  sampleSubject,
  subjectParts,
} from './subject-test-helpers'

const smic = sampleSubject('Le montant du SMIC')
const retraites = sampleSubject('Les retraites')

const validParams = {
  subjectId1: smic.id,
  subjectId2: retraites.id,
  runUnitOfWork: inMemoryUnitOfWork().run,
  subjectSource: fakeSubjectSource([subjectParts(smic), subjectParts(retraites)]),
}

const eloquent = { id: 'abc', reputation: 10000 }

describe('linkSubjectsUseCase', () => {
  it('should fail when contributor is null', async () => {
    const result = await linkSubjectsUseCase({ ...validParams, contributor: null })
    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('should fail when contributor lacks reputation', async () => {
    const result = await linkSubjectsUseCase({
      ...validParams,
      contributor: { id: 'abc', reputation: 0 },
    })
    expect(Either.isLeft(result)).toBe(true)
  })

  it('should fail when linking a subject to itself', async () => {
    const result = await linkSubjectsUseCase({
      ...validParams,
      contributor: eloquent,
      subjectId2: smic.id,
    })
    expect(Either.isLeft(result) && result.left).toContain('même sujet')
  })

  it('should fail when a subject does not exist, leaving no event behind', async () => {
    const { run, journal } = await journalWithSubjects([smic, []])
    const result = await linkSubjectsUseCase({
      ...validParams,
      contributor: eloquent,
      subjectId2: 'missing',
      runUnitOfWork: run,
    })
    expect(result).toEqual(Either.left('Sujet introuvable.'))
    expect(journal.all().map((e) => e.type)).toEqual(['SubjectAdded'])
  })

  it('should record the link on both subjects on success', async () => {
    const { run, journal } = await journalWithSubjects([smic, []], [retraites, []])

    const result = await linkSubjectsUseCase({
      ...validParams,
      contributor: eloquent,
      runUnitOfWork: run,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(
      journal
        .all()
        .slice(-2)
        .map((e) => [e.streamId, e.type, e.payload]),
    ).toEqual([
      [smic.id, 'SubjectLinked', { subjectId: retraites.id }],
      [retraites.id, 'SubjectLinked', { subjectId: smic.id }],
    ])
  })
})
