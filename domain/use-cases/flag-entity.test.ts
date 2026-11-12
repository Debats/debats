import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { ALREADY_FLAGGED, OWN_CONTRIBUTION } from '../aggregates/review'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { runFormWith, runWith } from './command-test-helpers'
import { confirmEntityUseCase } from './confirm-entity'
import { grantsIn } from './contributor-test-helpers'
import { flagEntityUseCase, withdrawFlagUseCase } from './flag-entity'
import { leasStatement, reader, reviewFactsIn, site } from './review-test-helpers'

const execute = runFormWith(site)
const camille = reader('camille')

const deadLink = {
  contributor: camille,
  entity: leasStatement,
  reason: 'source_mismatch' as const,
  comment: '  Le lien renvoie vers une page supprimée.  ',
}

describe('flagEntityUseCase', () => {
  it('records the flag with its reason and its comment, trimmed, and earns nothing yet', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(flagEntityUseCase(deadLink), run)

    expect(Either.isRight(result)).toBe(true)
    expect(journal.all()).toMatchObject([
      {
        streamType: 'review',
        streamId: 'statement-1',
        actorId: 'camille',
        type: 'Flagged',
        payload: {
          entityType: 'statement',
          reason: 'source_mismatch',
          comment: 'Le lien renvoie vers une page supprimée.',
        },
      },
    ])
    expect(grantsIn(journal)).toEqual([])
  })

  it('names the comment when it says too little, and the reason when it is not one of the list', async () => {
    const result = await execute(
      flagEntityUseCase({ ...deadLink, comment: 'Faux.', reason: 'boring' as never }),
    )

    expect(result).toEqual(
      Either.left({
        reason: 'Choisissez ce qui ne va pas.',
        comment: 'Dites ce qui ne va pas, en 10 à 1000 caractères.',
      }),
    )
  })

  it('is refused to the one who added the entity', async () => {
    const result = await execute(flagEntityUseCase({ ...deadLink, contributor: reader('lea') }))

    expect(result).toEqual(Either.left(OWN_CONTRIBUTION))
  })

  it('is refused to a reader whose flag is still open, until she withdraws it', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    await execute(flagEntityUseCase(deadLink), run)

    expect(await execute(flagEntityUseCase(deadLink), run)).toEqual(Either.left(ALREADY_FLAGGED))

    await runWith(site)(withdrawFlagUseCase(deadLink), run)
    expect(Either.isRight(await execute(flagEntityUseCase(deadLink), run))).toBe(true)
    expect(reviewFactsIn(journal)).toEqual([
      ['camille', 'Flagged'],
      ['camille', 'FlagWithdrawn'],
      ['camille', 'Flagged'],
    ])
  })

  it('takes back the confirmation the same reader had given', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    await runWith(site)(confirmEntityUseCase(deadLink), run)

    await execute(flagEntityUseCase(deadLink), run)

    expect(reviewFactsIn(journal)).toEqual([
      ['camille', 'Confirmed'],
      ['camille', 'ConfirmationWithdrawn'],
      ['camille', 'Flagged'],
    ])
  })
})
