import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { removeOrganisationMembershipUseCase } from './remove-organisation-membership'
import { createMembership } from '../entities/organisation-membership'
import { fakeMembershipRepo } from './organisation-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }

const membership = () =>
  createMembership({ organisationId: 'org-1', publicFigureId: 'figure-1', createdBy: 'founder' })

describe('removeOrganisationMembershipUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const existing = membership()
    const result = await removeOrganisationMembershipUseCase({
      contributor: { id: 'c', reputation: 1000 },
      membershipId: existing.id,
      membershipRepo: fakeMembershipRepo([existing]),
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('fails when the membership does not exist', async () => {
    const result = await removeOrganisationMembershipUseCase({
      contributor: idealiste,
      membershipId: 'missing',
      membershipRepo: fakeMembershipRepo(),
    })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('deletes the membership', async () => {
    const existing = membership()
    const membershipRepo = fakeMembershipRepo([existing])
    const result = await removeOrganisationMembershipUseCase({
      contributor: idealiste,
      membershipId: existing.id,
      membershipRepo,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(membershipRepo.rows).toHaveLength(0)
  })
})
