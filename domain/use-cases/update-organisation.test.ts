import { describe, it, expect } from 'vitest'
import { Either, Option } from 'effect'
import { updateOrganisationUseCase } from './update-organisation'
import { createOrganisation } from '../entities/organisation'
import {
  fakeOrganisationRepo,
  fakeReputationRepo,
  fakeWikipediaValidator,
  sampleOrganisation,
} from './organisation-test-helpers'

const idealiste = { id: 'contributor-1', reputation: 10000 }

const validParams = (existing = sampleOrganisation()) => ({
  contributor: idealiste,
  organisationId: existing.id,
  name: 'Attac',
  acronym: '',
  organisationType: 'ngo',
  presentation: 'Association altermondialiste fondée en 1998 en France.',
  wikipediaUrl: '',
  websiteUrl: 'https://france.attac.org',
  notorietySources: ['https://lemonde.fr/a', 'https://liberation.fr/b'],
  organisationRepo: fakeOrganisationRepo([existing]),
  reputationRepo: fakeReputationRepo(),
  wikipediaValidator: fakeWikipediaValidator(),
})

describe('updateOrganisationUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const result = await updateOrganisationUseCase({
      ...validParams(),
      contributor: { id: 'c', reputation: 1000 },
    })

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('fails when the organisation does not exist', async () => {
    const result = await updateOrganisationUseCase({
      ...validParams(),
      organisationId: 'missing',
    })

    expect(Either.isLeft(result) && result.left).toContain('introuvable')
  })

  it('rejects a new name that collides with another organisation', async () => {
    const existing = sampleOrganisation()
    const other = createOrganisation({
      name: 'Attac',
      organisationType: 'ngo',
      presentation: 'Une autre organisation portant déjà ce nom.',
      createdBy: 'founder',
    })
    const result = await updateOrganisationUseCase({
      ...validParams(existing),
      organisationRepo: fakeOrganisationRepo([existing, other]),
    })

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left.name).toContain(
      'existe déjà',
    )
  })

  it('saves the changes, keeps the identity and rewards the contributor', async () => {
    const existing = sampleOrganisation()
    const params = validParams(existing)
    const result = await updateOrganisationUseCase(params)

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.id).toBe(existing.id)
      expect(result.right.slug).toBe('attac')
      expect(result.right.acronym).toEqual(Option.none())
      expect(result.right.organisationType).toBe('ngo')
      expect(result.right.updatedBy).toBe('contributor-1')
      expect(result.right.createdBy).toBe('founder')
    }
    expect(params.reputationRepo.events).toEqual([
      { action: 'edited_organisation', contributorId: 'contributor-1' },
    ])
  })
})
