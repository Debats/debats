import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import { ANSWER_REQUIRED, NOTHING_TO_SETTLE, ReviewedEntity } from '../aggregates/review'
import { statementAdded, statementDeleted, statementStream } from '../aggregates/statement'
import { declarationContent, organisationAuthor, publicFigureAuthor } from '../entities/statement'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { StatementRepository } from '../repositories/statement-repository'
import {
  journalWithJointDeclarations,
  sampleJointDeclaration,
} from './joint-declaration-test-helpers'
import { runFormWith } from './command-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import { flagEntityUseCase } from './flag-entity'
import { leasStatement, moderator, reader, reviewFactsIn, site } from './review-test-helpers'
import { INVALID_FORM } from './preconditions'
import { EDITED_MEANWHILE } from './run-command'
import { NOT_REMOVABLE, settleFlagsUseCase } from './settle-flags'

const veil = publicFigureAuthor('figure-1')
const manifesto = sampleJointDeclaration()

/** The read side of the statements: Léa's is a signature of the manifesto, or one of the author's own */
const statementsWhere = (signature: { otherStatementIds: string[] } | null) =>
  Layer.succeed(StatementRepository, {
    findById: () =>
      Effect.succeed({
        author: veil,
        ...(signature ? { jointDeclaration: manifesto } : {}),
      }),
    findSignatureIds: () =>
      Effect.succeed(signature ? [leasStatement.id, ...signature.otherStatementIds] : []),
  } as unknown as StatementRepository)

const execute = runFormWith(Layer.merge(site, statementsWhere(null)))

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

  it('withdraws the whole signature when the statement removed is one: who did not sign one position signed none', async () => {
    const unit = await journalWithJointDeclarations([
      manifesto,
      {
        positions: [
          { subjectId: 'subject-1', positionId: 'position-1', quote: 'Citation du texte.' },
          { subjectId: 'subject-2', positionId: 'position-2', quote: 'Autre citation.' },
        ],
        signatories: [veil, organisationAuthor('organisation-attac')],
      },
    ])
    const signed = (positionId: string, subjectId: string) =>
      statementAdded({
        author: veil,
        subjectId,
        positionId,
        content: declarationContent('Citation du texte, suffisamment longue.'),
        sourceName: 'Manifeste de Paris',
        sourceUrl: 'https://parismanifesto.world',
        statedAt: new Date('2026-11-21'),
        argumentIds: [],
        jointDeclarationId: manifesto.id,
      })
    const opened = (id: string, event: ReturnType<typeof statementAdded>) =>
      Effect.runPromise(unit.journal.append(statementStream(id), 0, [event], { actorId: 'lea' }))
    await opened(leasStatement.id, signed('position-1', 'subject-1'))
    await opened('statement-2', signed('position-2', 'subject-2'))
    const asSignature = runFormWith(
      Layer.merge(site, statementsWhere({ otherStatementIds: ['statement-2'] })),
    )
    await asSignature(flagBy('camille'), unit.run)

    const result = await asSignature(
      settleFlagsUseCase({ ...settlement, outcome: 'removed', revision: 1 }),
      unit.run,
    )

    expect(Either.isRight(result)).toBe(true)
    expect(
      deedsIn(unit.journal)
        .filter((event) => event.type === 'StatementDeleted')
        .map((event) => event.streamId),
    ).toEqual(['statement-1', 'statement-2'])
    expect(deedsIn(unit.journal)).toContainEqual(
      expect.objectContaining({
        streamType: 'joint_declaration',
        streamId: manifesto.id,
        type: 'SignatoryWithdrawn',
        payload: { author: veil },
      }),
    )
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
