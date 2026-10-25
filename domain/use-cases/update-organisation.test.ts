import { describe, it, expect } from 'vitest'
import { Either, Option } from 'effect'
import { updateOrganisationUseCase } from './update-organisation'
import { createOrganisation } from '../entities/organisation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  fakeOrganisationRepo,
  fakeOrganisationSource,
  fakeWikipediaValidator,
  journalWithOrganisations,
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
  revision: 0,
  runUnitOfWork: inMemoryUnitOfWork().run,
  organisationSource: fakeOrganisationSource([existing]),
  organisationRepo: fakeOrganisationRepo([existing]),
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

  it('appends the edit to the stream, keeps the identity and rewards the contributor', async () => {
    const existing = sampleOrganisation()
    const unit = await journalWithOrganisations(existing)
    const params = { ...validParams(existing), runUnitOfWork: unit.run }
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
    expect(deedsIn(unit.journal).map((e) => [e.type, e.revision])).toEqual([
      ['OrganisationAdded', 1],
      ['OrganisationEdited', 2],
    ])
    expect(grantsIn(unit.journal)).toEqual([['contributor-1', 'edited_organisation', 5]])
  })

  it('imports an organisation the journal does not know yet, then edits it', async () => {
    const existing = sampleOrganisation()
    const unit = inMemoryUnitOfWork()
    const result = await updateOrganisationUseCase({
      ...validParams(existing),
      runUnitOfWork: unit.run,
    })

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(unit.journal).map((e) => [e.type, e.metadata])).toEqual([
      ['OrganisationImported', { source: 'import' }],
      ['OrganisationEdited', {}],
    ])
  })
})
