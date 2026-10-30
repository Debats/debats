import { describe, it, expect } from 'vitest'
import { Either, Layer } from 'effect'
import { removeOrganisationMembershipUseCase } from './remove-organisation-membership'
import { createMembership } from '../entities/entity-test-helpers'
import { OrganisationMembership } from '../entities/organisation-membership'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { fakeMembershipRepo, sampleFigure } from './organisation-test-helpers'
import { runWith } from './command-test-helpers'
import { journalWithFigures } from './public-figure-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }
const figure = sampleFigure()

const membership = () =>
  createMembership({ organisationId: 'org-1', publicFigureId: figure.id, createdBy: 'founder' })

/** The tables as the test wants them: the affiliations they hold */
const fakes = (known: OrganisationMembership[]) =>
  Layer.succeed(OrganisationMembershipRepository, fakeMembershipRepo(known))

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
    const { run, journal } = await journalWithFigures([figure, { memberships: [existing] }])

    const result = await runWith(fakes([existing]))(
      removeOrganisationMembershipUseCase({ contributor: idealiste, membershipId: existing.id }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'PublicFigureAdded', figure.createdBy],
      [2, 'MembershipAdded', figure.createdBy],
      [3, 'MembershipRemoved', 'contributor-1'],
    ])
    expect(journal.all().at(-1)?.payload).toEqual({ membershipId: existing.id })
  })
})
