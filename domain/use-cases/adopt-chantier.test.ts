import { describe, expect, it } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { adoptChantierUseCase, NOTHING_TO_ADOPT } from './adopt-chantier'
import { ADMIN, chantierFakes, fakeAgent, inMemoryChantiers } from './chantier-test-helpers'
import { runWith } from './command-test-helpers'
import { makeDraft } from './draft-test-helpers'

/** Drafts the site holds, and what the command assigned */
function fakeDrafts(held: DraftStatement[]) {
  const assigned: { draftIds: string[]; chantierId: string }[] = []
  const layer = Layer.succeed(DraftStatementRepository, {
    findAdoptableBySubjects: (subjects: string[]) =>
      Effect.succeed(
        held.filter(
          (d) =>
            subjects.includes(d.subjectTitle) && d.chantierId === null && d.status !== 'validated',
        ),
      ),
    assignChantier: (draftIds: string[], chantierId: string) =>
      Effect.sync(() => {
        assigned.push({ draftIds, chantierId })
      }),
  } as unknown as DraftStatementRepository)
  return { layer, assigned }
}

const input = {
  title: 'Énergie et climat',
  brief:
    'Reprendre les brouillons sur le nucléaire et les éoliennes, recaler les titres sur le catalogue.',
  subjects: ['Le nucléaire', 'Les éoliennes terrestres'],
}

describe('adoptChantierUseCase', () => {
  it('creates a pending, titled chantier and puts the adoptable drafts under it', async () => {
    const chantiers = inMemoryChantiers()
    const drafts = fakeDrafts([
      makeDraft({ id: 'd1', subjectTitle: 'Le nucléaire' }),
      makeDraft({ id: 'd2', subjectTitle: 'Les éoliennes terrestres', status: 'rejected' }),
      makeDraft({ id: 'd3', subjectTitle: 'Le nucléaire', status: 'validated' }),
      makeDraft({ id: 'd4', subjectTitle: 'Le nucléaire', chantierId: 'elsewhere' }),
      makeDraft({ id: 'd5', subjectTitle: 'La laïcité' }),
    ])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(adoptChantierUseCase({ contributor: ADMIN, input }))

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.adopted).toBe(2)
      expect(result.right.chantier).toMatchObject({
        title: 'Énergie et climat',
        status: 'pending',
        sessionId: null,
      })
      expect(drafts.assigned).toEqual([
        { draftIds: ['d1', 'd2'], chantierId: result.right.chantier.id },
      ])
    }
  })

  it('refuses when nothing on those subjects is left to adopt', async () => {
    const chantiers = inMemoryChantiers()
    const drafts = fakeDrafts([makeDraft({ id: 'd1', subjectTitle: 'La laïcité' })])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(adoptChantierUseCase({ contributor: ADMIN, input }))

    expect(result).toEqual(Either.left(NOTHING_TO_ADOPT))
    expect(chantiers.rows.size).toBe(0)
  })

  it('refuses a chantier without a title, a brief or subjects', async () => {
    const chantiers = inMemoryChantiers()
    const drafts = fakeDrafts([makeDraft({ subjectTitle: 'Le nucléaire' })])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(adoptChantierUseCase({ contributor: ADMIN, input: { ...input, subjects: [] } }))

    expect(Either.isLeft(result)).toBe(true)
    expect(chantiers.rows.size).toBe(0)
  })
})
