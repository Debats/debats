import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { confirmed, flagged, reviewStream } from '../aggregates/review'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { runUnitOfWork } from '../events/unit-of-work'
import { runWith } from './command-test-helpers'
import { grantsIn } from './contributor-test-helpers'
import { INVALID_FORM } from './preconditions'
import { NewCorrection, recordCorrection } from './record-correction'
import { leasStatement, reviewFactsIn } from './review-test-helpers'

/** A journal where Nadia confirmed Léa's statement and Camille flagged it */
async function reviewed() {
  const unit = inMemoryUnitOfWork()
  const stream = reviewStream(leasStatement.id)
  await Effect.runPromise(
    unit.journal.append(stream, 0, [confirmed('statement')], { actorId: 'nadia' }),
  )
  await Effect.runPromise(
    unit.journal.append(
      stream,
      1,
      [flagged('statement', { flagId: 'flag-1', reason: 'other', comment: 'Lien mort.' })],
      { actorId: 'camille' },
    ),
  )
  return unit
}

/** The edit of a moderator, as far as the review goes: what she said of it, in her transaction */
const correcting = (said: NewCorrection | undefined) =>
  runUnitOfWork((events) => recordCorrection(events, 'jalil', leasStatement, said))

const execute = runWith(Layer.empty)

describe('recordCorrection', () => {
  it('settles the open flags as corrected with the answer, and rewards who raised them', async () => {
    const { run, journal } = await reviewed()

    await execute(
      correcting({ settlesFlags: true, answer: 'Lien remplacé.', resetConfirmations: false }),
      run,
    )

    expect(reviewFactsIn(journal).at(-1)).toEqual(['jalil', 'FlagsSettled'])
    expect(journal.all().find((event) => event.type === 'FlagsSettled')?.payload).toEqual({
      outcome: 'corrected',
      answer: 'Lien remplacé.',
    })
    expect(grantsIn(journal)).toEqual([['camille', 'flag_upheld', 50]])
  })

  it('leaves the flags open, and pays nobody, when the edit was made for another reason', async () => {
    const { run, journal } = await reviewed()

    await execute(correcting({ settlesFlags: false, resetConfirmations: false }), run)

    expect(reviewFactsIn(journal)).toHaveLength(2)
    expect(grantsIn(journal)).toEqual([])
  })

  it('resets the confirmations when the editor says her edit changed what they stood for', async () => {
    const { run, journal } = await reviewed()

    await execute(correcting({ settlesFlags: false, resetConfirmations: true }), run)

    expect(reviewFactsIn(journal).at(-1)).toEqual(['jalil', 'ConfirmationsReset'])
    expect(grantsIn(journal)).toEqual([])
  })

  it('writes nothing for a form that had nothing to say of the review', async () => {
    const { run, journal } = await reviewed()

    await execute(correcting(undefined), run)

    expect(reviewFactsIn(journal)).toHaveLength(2)
  })

  it('refuses what is not a correction: what arrives from a form has no type', async () => {
    const { run } = await reviewed()

    const result = await execute(correcting({ settlesFlags: 'yes' } as never), run)

    expect(result).toEqual(Either.left(INVALID_FORM))
  })
})
