import { describe, expect, it } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { DraftStatement } from '../entities/draft-statement'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { adoptChantierUseCase, HELD_BY_LAUNCHED_CHANTIER, NOTHING_TO_ADOPT } from './adopt-chantier'
import {
  aChantier,
  ADMIN,
  chantierFakes,
  fakeAgent,
  inMemoryChantiers,
} from './chantier-test-helpers'
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
    findByIds: (ids: string[]) => Effect.succeed(held.filter((d) => ids.includes(d.id))),
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
    expect(chantiers.messages).toEqual([])
  })

  it('takes the drafts named by id from a chantier not yet launched, and keeps the recap as the agent’s word', async () => {
    const chantiers = inMemoryChantiers([
      aChantier({ id: 'thematic', status: 'pending', sessionId: null }),
    ])
    const drafts = fakeDrafts([
      makeDraft({ id: 'd1', subjectTitle: 'Le nucléaire', chantierId: 'thematic' }),
      makeDraft({ id: 'd2', subjectTitle: 'La laïcité', chantierId: null }),
      makeDraft({ id: 'd3', subjectTitle: 'Le nucléaire', status: 'validated' }),
    ])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(
      adoptChantierUseCase({
        contributor: ADMIN,
        input: {
          title: 'Reprise du 6 novembre',
          brief: 'Lance le chantier des 100 sujets du MVP.',
          recap: 'Vingt-six sujets traités, 224 brouillons envoyés.',
          drafts: ['d1', 'd2', 'd3', 'unknown'],
        },
      }),
    )

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.adopted).toBe(2)
      expect(drafts.assigned).toEqual([
        { draftIds: ['d1', 'd2'], chantierId: result.right.chantier.id },
      ])
      expect(chantiers.messages).toMatchObject([
        {
          chantierId: result.right.chantier.id,
          role: 'agent',
          text: 'Vingt-six sujets traités, 224 brouillons envoyés.',
          eventId: null,
        },
      ])
    }
  })

  it('takes a draft from a chantier closed, its agent done', async () => {
    const chantiers = inMemoryChantiers([aChantier({ id: 'done', status: 'closed' })])
    const drafts = fakeDrafts([
      makeDraft({ id: 'd1', subjectTitle: 'Le nucléaire', chantierId: 'done' }),
    ])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(adoptChantierUseCase({ contributor: ADMIN, input: { ...input, drafts: ['d1'] } }))

    expect(Either.isRight(result)).toBe(true)
    expect(drafts.assigned.map(({ draftIds }) => draftIds)).toEqual([['d1']])
  })

  it('leaves a draft to the chantier whose agent is launched', async () => {
    const chantiers = inMemoryChantiers([aChantier({ id: 'live', status: 'working' })])
    const drafts = fakeDrafts([
      makeDraft({ id: 'd1', subjectTitle: 'Le nucléaire', chantierId: 'live' }),
    ])
    const result = await runWith(
      Layer.merge(chantierFakes(chantiers.repository, fakeAgent().agent), drafts.layer),
    )(adoptChantierUseCase({ contributor: ADMIN, input: { ...input, drafts: ['d1'] } }))

    expect(result).toEqual(Either.left(HELD_BY_LAUNCHED_CHANTIER))
    expect(chantiers.rows.size).toBe(1)
    expect(drafts.assigned).toEqual([])
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
