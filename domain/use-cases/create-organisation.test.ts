import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { createOrganisationUseCase } from './create-organisation'
import {
  fakeOrganisationRepo,
  fakeReputationRepo,
  fakeWikipediaValidator,
  sampleOrganisation,
} from './organisation-test-helpers'

const eloquent = { id: 'contributor-1', reputation: 1000 }

const validParams = () => ({
  contributor: eloquent,
  name: 'Confédération générale du travail',
  acronym: 'CGT',
  organisationType: 'union',
  presentation: 'Confédération syndicale française fondée en 1895.',
  wikipediaUrl: 'https://fr.wikipedia.org/wiki/Confédération_générale_du_travail',
  websiteUrl: 'https://www.cgt.fr',
  notorietySources: [] as string[],
  organisationRepo: fakeOrganisationRepo(),
  reputationRepo: fakeReputationRepo(),
  wikipediaValidator: fakeWikipediaValidator(),
})

const fieldErrorsOf = (result: Awaited<ReturnType<typeof createOrganisationUseCase>>) =>
  Either.isLeft(result) && typeof result.left !== 'string' ? result.left : {}

describe('createOrganisationUseCase', () => {
  it('rejects an anonymous contributor', async () => {
    const result = await createOrganisationUseCase({ ...validParams(), contributor: null })

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('requires the Éloquent rank', async () => {
    const result = await createOrganisationUseCase({
      ...validParams(),
      contributor: { id: 'c', reputation: 999 },
    })

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('reports an unknown organisation type as a field error', async () => {
    const result = await createOrganisationUseCase({ ...validParams(), organisationType: 'cult' })

    expect(fieldErrorsOf(result).organisationType).toBeDefined()
  })

  it('reports a too short name and presentation as field errors', async () => {
    const result = await createOrganisationUseCase({
      ...validParams(),
      name: 'A',
      presentation: 'Court',
    })

    expect(fieldErrorsOf(result).name).toBeDefined()
    expect(fieldErrorsOf(result).presentation).toBeDefined()
  })

  it('reports a too long acronym as a field error', async () => {
    const result = await createOrganisationUseCase({ ...validParams(), acronym: 'A'.repeat(31) })

    expect(fieldErrorsOf(result).acronym).toBeDefined()
  })

  it('requires two notoriety sources when there is no Wikipedia page', async () => {
    const result = await createOrganisationUseCase({
      ...validParams(),
      wikipediaUrl: '',
      notorietySources: ['https://lemonde.fr/a'],
    })

    expect(fieldErrorsOf(result).notorietySources).toBeDefined()
  })

  it('rejects a Wikipedia page that does not exist', async () => {
    const result = await createOrganisationUseCase({
      ...validParams(),
      wikipediaValidator: fakeWikipediaValidator({ exists: false, isBiography: false }),
    })

    expect(fieldErrorsOf(result).wikipediaUrl).toContain('existe pas')
  })

  it('rejects a Wikipedia page that describes a person', async () => {
    const result = await createOrganisationUseCase({
      ...validParams(),
      wikipediaValidator: fakeWikipediaValidator({ exists: true, isBiography: true }),
    })

    expect(fieldErrorsOf(result).wikipediaUrl).toContain('personne')
  })

  it('rejects a name whose slug already exists', async () => {
    const existing = sampleOrganisation()
    const result = await createOrganisationUseCase({
      ...validParams(),
      name: existing.name,
      organisationRepo: fakeOrganisationRepo([existing]),
    })

    expect(fieldErrorsOf(result).name).toContain('existe déjà')
  })

  it('creates the organisation and rewards the contributor', async () => {
    const params = validParams()
    const result = await createOrganisationUseCase(params)

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.slug).toBe('confederation-generale-du-travail')
      expect(result.right.organisationType).toBe('union')
      expect(result.right.createdBy).toBe('contributor-1')
    }
    expect(params.reputationRepo.events).toEqual([
      { action: 'added_organisation_validated', contributorId: 'contributor-1' },
    ])
  })
})
