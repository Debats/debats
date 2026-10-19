import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { removeOrganisationMembershipUseCase } from './remove-organisation-membership'
import { createMembership } from '../entities/organisation-membership'
import { addMembership, publicFigureStream } from '../aggregates/public-figure'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeMembershipRepo, sampleFigure } from './organisation-test-helpers'
import {
  fakePublicFigureSource,
  figureParts,
  journalWithFigures,
} from './public-figure-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const figure = sampleFigure()

const membership = () =>
  createMembership({ organisationId: 'org-1', publicFigureId: figure.id, createdBy: 'founder' })

describe('removeOrganisationMembershipUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const existing = membership()
    const result = await removeOrganisationMembershipUseCase({
      contributor: { id: 'c', reputation: 1000 },
      membershipId: existing.id,
      runUnitOfWork: inMemoryUnitOfWork().run,
      publicFigureSource: fakePublicFigureSource([
        figureParts(figure, { memberships: [existing] }),
      ]),
      membershipRepo: fakeMembershipRepo([existing]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('fails when the membership does not exist', async () => {
    const result = await removeOrganisationMembershipUseCase({
      contributor: idealiste,
      membershipId: 'missing',
      runUnitOfWork: inMemoryUnitOfWork().run,
      publicFigureSource: fakePublicFigureSource([figureParts(figure)]),
      membershipRepo: fakeMembershipRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the removal in the figure stream', async () => {
    const existing = membership()
    const { run, journal } = await journalWithFigures(figure)
    await Effect.runPromise(
      journal.append(
        publicFigureStream(figure.id),
        1,
        [addMembership({ membershipId: existing.id, organisationId: 'org-1' })],
        { actorId: 'founder' },
      ),
    )

    const result = await removeOrganisationMembershipUseCase({
      contributor: idealiste,
      membershipId: existing.id,
      runUnitOfWork: run,
      publicFigureSource: fakePublicFigureSource([]),
      membershipRepo: fakeMembershipRepo([existing]),
    })

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().at(-1)).toMatchObject({
      type: 'MembershipRemoved',
      revision: 3,
      payload: { membershipId: existing.id },
    })
  })

  it('imports the figure on demand, affiliation included, before removing it', async () => {
    const existing = membership()
    const { run, journal } = inMemoryUnitOfWork()

    const result = await removeOrganisationMembershipUseCase({
      contributor: idealiste,
      membershipId: existing.id,
      runUnitOfWork: run,
      publicFigureSource: fakePublicFigureSource([
        figureParts(figure, { memberships: [existing] }),
      ]),
      membershipRepo: fakeMembershipRepo([existing]),
    })

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'PublicFigureImported', figure.createdBy],
      [2, 'MembershipImported', 'founder'],
      [3, 'MembershipRemoved', 'contributor-1'],
    ])
  })
})
