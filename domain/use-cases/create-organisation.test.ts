import { describe, it, expect } from 'vitest'
import { Either, Layer, Option } from 'effect'
import { createOrganisationUseCase } from './create-organisation'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { runFormWith } from './command-test-helpers'
import {
  fakeOrganisationRepo,
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
})

/** The read side and Wikipedia as the test wants them */
const fakes = (
  overrides: { organisations?: OrganisationRepository; wikipedia?: WikipediaValidator } = {},
) =>
  Layer.mergeAll(
    Layer.succeed(OrganisationRepository, overrides.organisations ?? fakeOrganisationRepo()),
    Layer.succeed(WikipediaValidator, overrides.wikipedia ?? fakeWikipediaValidator()),
  )

const execute = runFormWith(fakes())

const fieldErrorsOf = (result: Awaited<ReturnType<typeof execute>>) =>
  Either.isLeft(result) && typeof result.left !== 'string' ? result.left : {}

describe('createOrganisationUseCase', () => {
  it('rejects an anonymous contributor', async () => {
    const result = await execute(createOrganisationUseCase({ ...validParams(), contributor: null }))

    expect(Either.isLeft(result) && result.left).toContain('connecté')
  })

  it('requires the Éloquent rank', async () => {
    const result = await execute(
      createOrganisationUseCase({ ...validParams(), contributor: { id: 'c', reputation: 999 } }),
    )

    expect(Either.isLeft(result) && result.left).toContain('Éloquent')
  })

  it('reports an unknown organisation type as a field error', async () => {
    const result = await execute(
      createOrganisationUseCase({ ...validParams(), organisationType: 'cult' }),
    )

    expect(fieldErrorsOf(result).organisationType).toBeDefined()
  })

  it('reports a too short name and presentation as field errors', async () => {
    const result = await execute(
      createOrganisationUseCase({ ...validParams(), name: 'A', presentation: 'Court' }),
    )

    expect(fieldErrorsOf(result).name).toBeDefined()
    expect(fieldErrorsOf(result).presentation).toBeDefined()
  })

  it('reports a too long acronym as a field error', async () => {
    const result = await execute(
      createOrganisationUseCase({ ...validParams(), acronym: 'A'.repeat(31) }),
    )

    expect(fieldErrorsOf(result).acronym).toBeDefined()
  })

  it('requires two notoriety sources when there is no Wikipedia page', async () => {
    const result = await execute(
      createOrganisationUseCase({
        ...validParams(),
        wikipediaUrl: '',
        notorietySources: ['https://lemonde.fr/a'],
      }),
    )

    expect(fieldErrorsOf(result).notorietySources).toBeDefined()
  })

  it('rejects a Wikipedia page that does not exist', async () => {
    const result = await runFormWith(
      fakes({ wikipedia: fakeWikipediaValidator({ exists: false, isBiography: false }) }),
    )(createOrganisationUseCase(validParams()))

    expect(fieldErrorsOf(result).wikipediaUrl).toContain('existe pas')
  })

  it('rejects a Wikipedia page that describes a person', async () => {
    const result = await runFormWith(
      fakes({ wikipedia: fakeWikipediaValidator({ exists: true, isBiography: true }) }),
    )(createOrganisationUseCase(validParams()))

    expect(fieldErrorsOf(result).wikipediaUrl).toContain('personne')
  })

  it('rejects a name whose slug already exists', async () => {
    const existing = sampleOrganisation()
    const result = await runFormWith(fakes({ organisations: fakeOrganisationRepo([existing]) }))(
      createOrganisationUseCase({ ...validParams(), name: existing.name }),
    )

    expect(fieldErrorsOf(result).name).toContain('existe déjà')
  })

  it('records the organisation in the journal and rewards the contributor', async () => {
    const unit = inMemoryUnitOfWork()
    const result = await execute(createOrganisationUseCase(validParams()), unit.run)

    expect(Either.isRight(result)).toBe(true)
    if (Either.isRight(result)) {
      expect(result.right.slug).toBe('confederation-generale-du-travail')
      expect(result.right.acronym).toEqual(Option.some('CGT'))
      expect(result.right.organisationType).toBe('union')
      expect(result.right.createdBy).toBe('contributor-1')
      expect(deedsIn(unit.journal)).toMatchObject([
        {
          streamType: 'organisation',
          streamId: result.right.id,
          revision: 1,
          type: 'OrganisationAdded',
          actorId: 'contributor-1',
        },
      ])
    }
    expect(grantsIn(unit.journal)).toEqual([['contributor-1', 'added_organisation_validated', 50]])
  })
})
