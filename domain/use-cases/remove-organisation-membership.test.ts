import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { removeOrganisationMembershipUseCase } from './remove-organisation-membership'
import { createMembership } from '../entities/entity-test-helpers'
import { OrganisationMembership } from '../entities/organisation-membership'
import { membershipAdded, publicFigureStream } from '../aggregates/public-figure'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { fakeMembershipRepo, sampleFigure } from './organisation-test-helpers'
import { runWith } from './command-test-helpers'
import { PublicFigureSource } from './public-figure-stream'
import {
  fakePublicFigureSource,
  figureParts,
  journalWithFigures,
} from './public-figure-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const figure = sampleFigure()

const membership = () =>
  createMembership({ organisationId: 'org-1', publicFigureId: figure.id, createdBy: 'founder' })

/** The tables as the test wants them: the figure with these affiliations, or no figure at all */
const fakes = (known: OrganisationMembership[], figureInTables = true) =>
  Layer.mergeAll(
    Layer.succeed(
      PublicFigureSource,
      fakePublicFigureSource(figureInTables ? [figureParts(figure, { memberships: known })] : []),
    ),
    Layer.succeed(OrganisationMembershipRepository, fakeMembershipRepo(known)),
  )

describe('removeOrganisationMembershipUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const existing = membership()
    const result = await runWith(fakes([existing]))(
      removeOrganisationMembershipUseCase({
        contributor: { id: 'c', reputation: 1000 },
        membershipId: existing.id,
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('fails when the membership does not exist', async () => {
    const result = await runWith(fakes([]))(
      removeOrganisationMembershipUseCase({ contributor: idealiste, membershipId: 'missing' }),
    )

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('records the removal in the figure stream', async () => {
    const existing = membership()
    const { run, journal } = await journalWithFigures(figure)
    await Effect.runPromise(
      journal.append(
        publicFigureStream(figure.id),
        1,
        [membershipAdded({ membershipId: existing.id, organisationId: 'org-1' })],
        { actorId: 'founder' },
      ),
    )

    const result = await runWith(fakes([existing], false))(
      removeOrganisationMembershipUseCase({ contributor: idealiste, membershipId: existing.id }),
      run,
    )

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

    const result = await runWith(fakes([existing]))(
      removeOrganisationMembershipUseCase({ contributor: idealiste, membershipId: existing.id }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'PublicFigureImported', figure.createdBy],
      [2, 'MembershipImported', 'founder'],
      [3, 'MembershipRemoved', 'contributor-1'],
    ])
  })
})
