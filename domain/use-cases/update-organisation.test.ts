import { describe, it, expect } from 'vitest'
import { Either, Layer, Option } from 'effect'
import { updateOrganisationUseCase } from './update-organisation'
import { createOrganisation } from '../entities/entity-test-helpers'
import { Organisation } from '../entities/organisation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
import { OrganisationSource } from './organisation-stream'
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
})

/** The read side as the test wants it: the organisations the tables hold */
const fakes = (known: Organisation[]) =>
  Layer.mergeAll(
    Layer.succeed(OrganisationSource, fakeOrganisationSource(known)),
    Layer.succeed(OrganisationRepository, fakeOrganisationRepo(known)),
    Layer.succeed(WikipediaValidator, fakeWikipediaValidator()),
  )

describe('updateOrganisationUseCase', () => {
  it('requires the Idéaliste rank', async () => {
    const existing = sampleOrganisation()
    const result = await runFormWith(fakes([existing]))(
      updateOrganisationUseCase({
        ...validParams(existing),
        contributor: { id: 'c', reputation: 1000 },
      }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Idéaliste')
  })

  it('fails when the organisation does not exist', async () => {
    const existing = sampleOrganisation()
    const result = await runFormWith(fakes([existing]))(
      updateOrganisationUseCase({ ...validParams(existing), organisationId: 'missing' }),
    )

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
    const result = await runFormWith(fakes([existing, other]))(
      updateOrganisationUseCase(validParams(existing)),
    )

    expect(Either.isLeft(result) && typeof result.left !== 'string' && result.left.name).toContain(
      'existe déjà',
    )
  })

  it('appends the edit to the stream, keeps the identity and rewards the contributor', async () => {
    const existing = sampleOrganisation()
    const unit = await journalWithOrganisations(existing)
    const result = await runFormWith(fakes([existing]))(
      updateOrganisationUseCase(validParams(existing)),
      unit.run,
    )

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
    const result = await runFormWith(fakes([existing]))(
      updateOrganisationUseCase(validParams(existing)),
      unit.run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(unit.journal).map((e) => [e.type, e.metadata])).toEqual([
      ['OrganisationImported', { source: 'import' }],
      ['OrganisationEdited', {}],
    ])
  })
})
