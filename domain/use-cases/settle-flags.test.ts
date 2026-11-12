import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { ANSWER_REQUIRED, NOTHING_TO_SETTLE, ReviewedEntity } from '../aggregates/review'
import { statementAdded, statementDeleted, statementStream } from '../aggregates/statement'
import { declarationContent, publicFigureAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { runFormWith } from './command-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { flagEntityUseCase } from './flag-entity'
import { leasStatement, moderator, reader, reviewFactsIn, site } from './review-test-helpers'
import { INVALID_FORM } from './preconditions'
import { EDITED_MEANWHILE } from './run-command'
import { NOT_REMOVABLE, settleFlagsUseCase } from './settle-flags'

const execute = runFormWith(site)

const flagBy = (id: string, entity: ReviewedEntity = leasStatement) =>
  flagEntityUseCase({
    contributor: reader(id),
    entity,
    reason: 'source_mismatch',
    comment: 'Le lien renvoie vers une page supprimée.',
  })

/** A journal where Léa's statement has its stream, and two readers flagged it */
async function flaggedTwice() {
  const unit = inMemoryUnitOfWork()
  await Effect.runPromise(
    unit.journal.append(
      statementStream(leasStatement.id),
      0,
      [
        statementAdded({
          author: publicFigureAuthor('figure-1'),
          subjectId: 'subject-1',
          positionId: 'position-1',
          content: declarationContent('Citation originale suffisamment longue.'),
          sourceName: 'Le Monde',
          sourceUrl: 'https://lemonde.fr/article',
          statedAt: new Date('2024-01-15'),
          argumentIds: [],
        }),
      ],
      { actorId: 'lea' },
    ),
  )
  await execute(flagBy('camille'), unit.run)
  await execute(flagBy('sacha'), unit.run)
  return unit
}

const settlement = {
  contributor: moderator,
  entity: leasStatement,
  outcome: 'dismissed' as const,
  answer: 'La source dit bien cela, à 12 min 40.',
  /** The review as the moderator's page showed it: the two flags */
  revision: 2,
}

describe('settleFlagsUseCase', () => {
  it('dismisses every open flag with the answer, and rewards nobody', async () => {
    const { run, journal } = await flaggedTwice()

    const result = await execute(settleFlagsUseCase(settlement), run)

    expect(Either.isRight(result)).toBe(true)
    expect(reviewFactsIn(journal).at(-1)).toEqual(['jalil', 'FlagsSettled'])
    expect(deedsIn(journal).at(-1)?.payload).toEqual({
      outcome: 'dismissed',
      answer: 'La source dit bien cela, à 12 min 40.',
    })
    expect(grantsIn(journal)).toEqual([])
  })

  it('removes the statement in the same transaction, and rewards each reader who flagged it', async () => {
    const { run, journal } = await flaggedTwice()

    const result = await execute(settleFlagsUseCase({ ...settlement, outcome: 'removed' }), run)

    expect(Either.isRight(result)).toBe(true)
    expect(deedsIn(journal).slice(-2)).toMatchObject([
      { streamType: 'review', type: 'FlagsSettled', payload: { outcome: 'removed' } },
      { streamType: 'statement', streamId: 'statement-1', type: 'StatementDeleted' },
    ])
    expect(grantsIn(journal)).toEqual([
      ['camille', 'flag_upheld', 50],
      ['sacha', 'flag_upheld', 50],
    ])
  })

  it('settles the flags of a statement already gone with its subject, instead of leaving them open on nothing', async () => {
    const { run, journal } = await flaggedTwice()
    await Effect.runPromise(
      journal.append(statementStream(leasStatement.id), 1, [statementDeleted()], {
        actorId: 'jalil',
      }),
    )

    const result = await execute(settleFlagsUseCase({ ...settlement, outcome: 'removed' }), run)

    expect(Either.isRight(result)).toBe(true)
    expect(reviewFactsIn(journal).at(-1)).toEqual(['jalil', 'FlagsSettled'])
    expect(grantsIn(journal)).toHaveLength(2)
  })

  it('takes a moderator', async () => {
    const { run } = await flaggedTwice()

    const result = await execute(
      settleFlagsUseCase({ ...settlement, contributor: reader('nadia', 9999) }),
      run,
    )

    expect(result).toEqual(Either.left('Vous devez être Idéaliste pour traiter un signalement.'))
  })

  it('asks for an answer, named on its field', async () => {
    const { run } = await flaggedTwice()

    const result = await execute(settleFlagsUseCase({ ...settlement, answer: ' ' }), run)

    expect(result).toEqual(Either.left({ answer: ANSWER_REQUIRED }))
  })

  it('refuses to settle flags the moderator has not read: one raised since her page was rendered', async () => {
    const { run, journal } = await flaggedTwice()
    await execute(flagBy('nadia'), run)

    const result = await execute(settleFlagsUseCase(settlement), run)

    expect(result).toEqual(Either.left(EDITED_MEANWHILE))
    expect(reviewFactsIn(journal).at(-1)).toEqual(['nadia', 'Flagged'])
  })

  it('settles nothing as corrected: a form that says so is not one', async () => {
    const { run, journal } = await flaggedTwice()

    const result = await execute(
      settleFlagsUseCase({ ...settlement, outcome: 'corrected' as never }),
      run,
    )

    expect(result).toEqual(Either.left(INVALID_FORM))
    expect(reviewFactsIn(journal).at(-1)).toEqual(['sacha', 'Flagged'])
  })

  it('has nothing to settle on an entity without an open flag', async () => {
    const result = await execute(settleFlagsUseCase({ ...settlement, revision: 0 }))

    expect(result).toEqual(Either.left(NOTHING_TO_SETTLE))
  })

  it('removes nothing but a statement, and leaves the flags open', async () => {
    const subject: ReviewedEntity = { type: 'subject', id: 'subject-1' }
    const { run, journal } = inMemoryUnitOfWork()
    await execute(flagBy('camille', subject), run)

    const result = await execute(
      settleFlagsUseCase({ ...settlement, entity: subject, outcome: 'removed', revision: 1 }),
      run,
    )

    expect(result).toEqual(Either.left(NOT_REMOVABLE))
    expect(reviewFactsIn(journal)).toEqual([['camille', 'Flagged']])
  })
})
