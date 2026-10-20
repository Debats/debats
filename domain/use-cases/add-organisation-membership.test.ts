import { describe, it, expect } from 'vitest'
import { Either, Option } from 'effect'
import { addOrganisationMembershipUseCase } from './add-organisation-membership'
import { createMembership } from '../entities/organisation-membership'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { fakeOrganisationRepo, sampleFigure, sampleOrganisation } from './organisation-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  fakePublicFigureSource,
  figureParts,
  journalWithFigures,
} from './public-figure-test-helpers'

const eloquent = { id: 'contributor-1', reputation: 1000 }

const setup = () => {
  const organisation = sampleOrganisation()
  const figure = sampleFigure()
  return {
    organisation,
    figure,
    params: {
      contributor: eloquent,
      organisationId: organisation.id,
      publicFigureId: figure.id,
      role: 'Porte-parole',
      startedOn: '2020-01-15',
      endedOn: '',
      runUnitOfWork: inMemoryUnitOfWork().run,
      publicFigureSource: fakePublicFigureSource([figureParts(figure)]),
      organisationRepo: fakeOrganisationRepo([organisation]),
    },
  }
}

const fieldErrorsOf = (result: Awaited<ReturnType<typeof addOrganisationMembershipUseCase>>) =>
  Either.isLeft(result) && typeof result.left !== 'string' ? result.left : {}

describe('addOrganisationMembershipUseCase', () => {
  it('requires the Éloquent rank', async () => {
    const { params } = setup()
    const result = await addOrganisationMembershipUseCase({
      ...params,
      contributor: { id: 'c', reputation: 0 },
    })

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('fails when the organisation is unknown', async () => {
    const { params } = setup()
    const result = await addOrganisationMembershipUseCase({ ...params, organisationId: 'nope' })

    expect(Either.isLeft(result) && result.left).toContain('organisation')
  })

  it('fails when the public figure is unknown', async () => {
    const { params } = setup()
    const result = await addOrganisationMembershipUseCase({ ...params, publicFigureId: '' })

    expect(fieldErrorsOf(result).publicFigureId).toBeDefined()
  })

  it('reports malformed dates as field errors', async () => {
    const { params } = setup()
    const result = await addOrganisationMembershipUseCase({ ...params, startedOn: '15/01/2020' })

    expect(fieldErrorsOf(result).startedOn).toBeDefined()
  })

  it('reports an end date before the start date as a field error', async () => {
    const { params } = setup()
    const result = await addOrganisationMembershipUseCase({
      ...params,
      startedOn: '2020-01-15',
      endedOn: '2019-01-01',
    })

    expect(fieldErrorsOf(result).endedOn).toBeDefined()
  })

  it('refuses a second current membership of the same figure in the same organisation', async () => {
    const { params, organisation, figure } = setup()
    const current = createMembership({
      organisationId: organisation.id,
      publicFigureId: figure.id,
      createdBy: 'founder',
    })
    const result = await addOrganisationMembershipUseCase({
      ...params,
      publicFigureSource: fakePublicFigureSource([figureParts(figure, { memberships: [current] })]),
    })

    expect(fieldErrorsOf(result).publicFigureId).toContain('déjà')
  })

  it('accepts a new membership when the previous one has ended', async () => {
    const { params, organisation, figure } = setup()
    const former = createMembership({
      organisationId: organisation.id,
      publicFigureId: figure.id,
      endedOn: new Date('2010-01-01'),
      createdBy: 'founder',
    })
    const result = await addOrganisationMembershipUseCase({
      ...params,
      publicFigureSource: fakePublicFigureSource([figureParts(figure, { memberships: [former] })]),
    })

    expect(Either.isRight(result)).toBe(true)
  })

  it('records the membership in the figure stream and rewards the contributor', async () => {
    const { params, figure } = setup()
    const { run, journal } = await journalWithFigures(figure)
    const result = await addOrganisationMembershipUseCase({ ...params, runUnitOfWork: run })

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.publicFigureId).toBe(figure.id)
      expect(result.right.role).toEqual(Option.some('Porte-parole'))
      expect(result.right.startedOn).toEqual(Option.some(new Date('2020-01-15')))
      expect(result.right.endedOn).toEqual(Option.none())
      expect(result.right.createdBy).toBe('contributor-1')
      expect(deedsIn(journal).at(-1)).toMatchObject({
        streamId: figure.id,
        type: 'MembershipAdded',
        revision: 2,
        actorId: 'contributor-1',
        payload: { membershipId: result.right.id, role: 'Porte-parole', startedOn: '2020-01-15' },
      })
    }
    expect(grantsIn(journal)).toEqual([['contributor-1', 'added_membership', 5]])
  })
})
