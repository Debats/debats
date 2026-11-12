import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { confirmed, OWN_CONTRIBUTION } from '../aggregates/review'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { RunUnitOfWork } from '../events/unit-of-work'
import { runWith } from './command-test-helpers'
import { confirmEntityUseCase, withdrawConfirmationUseCase } from './confirm-entity'
import { grantsIn } from './contributor-test-helpers'
import { SIGN_IN } from './preconditions'
import { ENTITY_NOT_FOUND } from './review-stream'
import { leasStatement, reader, reviewFactsIn, site } from './review-test-helpers'

const execute = runWith(site)
const nadia = reader('nadia')

describe('confirmEntityUseCase', () => {
  it('records the confirmation and the point it earns, together', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      confirmEntityUseCase({ contributor: nadia, entity: leasStatement }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(reviewFactsIn(journal)).toEqual([['nadia', 'Confirmed']])
    expect(grantsIn(journal)).toEqual([['nadia', 'confirmed_entity', 1]])
  })

  it('is refused to a visitor who is not signed in', async () => {
    const result = await execute(confirmEntityUseCase({ contributor: null, entity: leasStatement }))

    expect(result).toEqual(Either.left(SIGN_IN))
  })

  it('is refused to an account whose reputation went below zero', async () => {
    const result = await execute(
      confirmEntityUseCase({ contributor: reader('troll', -1), entity: leasStatement }),
    )

    expect(result).toEqual(Either.left('Vous devez être Métèque pour confirmer un contenu.'))
  })

  it('is refused to the one who added the entity, and writes nothing', async () => {
    const { run, journal } = inMemoryUnitOfWork()

    const result = await execute(
      confirmEntityUseCase({ contributor: reader('lea'), entity: leasStatement }),
      run,
    )

    expect(result).toEqual(Either.left(OWN_CONTRIBUTION))
    expect(journal.all()).toEqual([])
  })

  it('is refused on an entity the site does not hold', async () => {
    const result = await execute(
      confirmEntityUseCase({ contributor: nadia, entity: { type: 'statement', id: 'gone' } }),
    )

    expect(result).toEqual(Either.left(ENTITY_NOT_FOUND))
  })

  it('decides again, without a word to the reader, when another one wrote on the entity meanwhile', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    let raced = false
    /** The first time the review is read, somebody else confirms before the command writes */
    const racing: RunUnitOfWork = (work) =>
      run((events) =>
        work({
          ...events,
          load: (stream) =>
            Effect.tap(events.load(stream), () => {
              if (raced) return Effect.void
              raced = true
              return Effect.orDie(
                events.appendToEnd(stream, [confirmed('statement')], { actorId: 'sacha' }),
              )
            }),
        }),
      )

    const result = await execute(
      confirmEntityUseCase({ contributor: nadia, entity: leasStatement }),
      racing,
    )

    expect(raced).toBe(true)
    expect(Either.isRight(result)).toBe(true)
    expect(reviewFactsIn(journal)).toEqual([['nadia', 'Confirmed']])
    expect(grantsIn(journal)).toEqual([['nadia', 'confirmed_entity', 1]])
  })

  it('lets a reader take her confirmation back whatever became of her reputation', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    await execute(confirmEntityUseCase({ contributor: nadia, entity: leasStatement }), run)

    const result = await execute(
      withdrawConfirmationUseCase({ contributor: reader('nadia', -50), entity: leasStatement }),
      run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(reviewFactsIn(journal).at(-1)).toEqual(['nadia', 'ConfirmationWithdrawn'])
  })

  it('earns once: neither a second click nor a withdrawal followed by a new confirmation pays', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    const confirmation = { contributor: nadia, entity: leasStatement }

    await execute(confirmEntityUseCase(confirmation), run)
    await execute(confirmEntityUseCase(confirmation), run)
    await execute(withdrawConfirmationUseCase(confirmation), run)
    await execute(confirmEntityUseCase(confirmation), run)

    expect(reviewFactsIn(journal)).toEqual([
      ['nadia', 'Confirmed'],
      ['nadia', 'ConfirmationWithdrawn'],
      ['nadia', 'Confirmed'],
    ])
    expect(grantsIn(journal)).toEqual([['nadia', 'confirmed_entity', 1]])
  })
})
