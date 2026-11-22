import { describe, it, expect } from 'vitest'
import { Effect, Either, Layer } from 'effect'
import {
  jointDeclarationStream,
  replayJointDeclaration,
  signatureOf,
} from '../aggregates/joint-declaration'
import {
  ALREADY_A_SIGNATURE,
  replayStatement,
  statementAdded,
  statementStream,
} from '../aggregates/statement'
import {
  actContent,
  declarationContent,
  publicFigureAuthor,
  StatementAuthor,
} from '../entities/statement'
import { JointDeclarationRepository } from '../repositories/joint-declaration-repository'
import { StatementRepository } from '../repositories/statement-repository'
import {
  ATTACHED_STATEMENT_NOT_FOUND,
  attachToJointDeclarationUseCase,
  SAME_POSITION_TWICE,
  SEVERAL_SIGNATORIES,
  TEXT_SILENT_ON_POSITION,
} from './attach-to-joint-declaration'
import { runFormWith } from './command-test-helpers'
import { deedsIn, grantsIn } from './contributor-test-helpers'
import {
  journalWithJointDeclarations,
  sampleJointDeclaration,
} from './joint-declaration-test-helpers'

const idealist = { id: 'jalil', reputation: 10000 }
const sophist = { id: 'alice', reputation: 0 }

const text = sampleJointDeclaration()
const onMedia = { subjectId: 'subject-media', positionId: 'pos-media', quote: 'Les mots du texte.' }
const onAi = { subjectId: 'subject-ai', positionId: 'pos-ai', quote: 'D’autres mots du texte.' }
const piketty = publicFigureAuthor('figure-piketty')
const zucman = publicFigureAuthor('figure-zucman')

/** A deed recorded before the site knew the text: « coauthor of the manifesto » */
const deedOf = (author: StatementAuthor, taken: typeof onMedia) =>
  statementAdded({
    author,
    subjectId: taken.subjectId,
    positionId: taken.positionId,
    content: actContent('Coauteur du Manifeste de Paris'),
    sourceName: 'Seuil',
    sourceUrl: 'https://seuil.com/manifeste',
    statedAt: new Date('2026-11-20'),
    argumentIds: ['arg-1'],
  })

/**
 * A journal where the text takes two positions, with these statements and
 * signatories, and the read side that tells what it holds.
 */
async function site(
  seed: Record<string, ReturnType<typeof statementAdded>>,
  signatories: StatementAuthor[] = [],
) {
  const unit = await journalWithJointDeclarations([
    text,
    { positions: [onMedia, onAi], signatories },
  ])
  for (const [id, added] of Object.entries(seed)) {
    await Effect.runPromise(
      unit.journal.append(statementStream(id), 0, [added], { actorId: 'lea' }),
    )
  }

  const streamOf = (type: string, id: string) =>
    unit.journal.all().filter((e) => e.streamType === type && e.streamId === id)
  const stateOf = (id: string) => {
    const state = replayStatement(streamOf('statement', id))
    return Either.isRight(state) && state.right && !state.right.deletedAt ? state.right : null
  }
  const statementIds = () =>
    Array.from(
      new Set(
        unit.journal
          .all()
          .filter((e) => e.streamType === 'statement')
          .map((e) => e.streamId),
      ),
    )

  const layer = Layer.mergeAll(
    Layer.succeed(StatementRepository, {
      findById: (id: string) => Effect.sync(() => stateOf(id)?.statement ?? null),
      findSignatureId: (declarationId: string, author: StatementAuthor, positionId: string) =>
        Effect.sync(
          () =>
            statementIds().find((id) => {
              const state = stateOf(id)
              return (
                state?.jointDeclarationId === declarationId &&
                state.statement.author.id === author.id &&
                state.statement.positionId === positionId
              )
            }) ?? null,
        ),
    } as unknown as StatementRepository),
    Layer.succeed(JointDeclarationRepository, {
      findHeld: (id: string) =>
        Effect.sync(() => {
          const state = replayJointDeclaration(streamOf('joint_declaration', id))
          const held = Either.isRight(state) ? state.right : null
          return {
            positions: [...(held?.positions ?? [])],
            signatories: [...(held?.signatories ?? [])],
          }
        }),
    } as unknown as JointDeclarationRepository),
  )
  const attach = (statementIdsToAttach: string[], contributor: typeof idealist | null = idealist) =>
    runFormWith(layer)(
      attachToJointDeclarationUseCase({
        contributor,
        declarationId: text.id,
        statementIds: statementIdsToAttach,
      }),
      unit.run,
    )
  return { ...unit, attach, stateOf, statementIds }
}

/** What the journal wrote since the seed, as `[stream type, event type]` */
const writtenIn = (journal: Awaited<ReturnType<typeof site>>['journal'], from: number) =>
  deedsIn(journal)
    .slice(from)
    .map((event) => [event.streamType, event.type])

describe('attachToJointDeclarationUseCase', () => {
  it('takes who may edit a statement: it rewrites one', async () => {
    const { attach } = await site({ 'deed-media': deedOf(piketty, onMedia) })
    expect(Either.isLeft(await attach(['deed-media'], null))).toBe(true)
    const refused = await attach(['deed-media'], sophist)
    expect(Either.isLeft(refused) && refused.left).toContain('rattacher une prise de position')
  })

  it('makes the statement the signature the text makes, adds its author to the signatories and gives them the other positions', async () => {
    const { attach, journal, stateOf, statementIds } = await site({
      'deed-media': deedOf(piketty, onMedia),
    })
    const before = deedsIn(journal).length

    const result = await attach(['deed-media'])

    expect(Either.isRight(result)).toBe(true)
    expect(writtenIn(journal, before)).toEqual([
      ['joint_declaration', 'SignatoryAdded'],
      ['statement', 'StatementJoinedDeclaration'],
      ['statement', 'StatementAdded'],
    ])
    const attached = stateOf('deed-media')
    expect(attached?.jointDeclarationId).toBe(text.id)
    expect(attached?.statement).toMatchObject({
      positionId: onMedia.positionId,
      content: declarationContent(onMedia.quote),
      sourceName: text.sourceName,
      sourceUrl: text.sourceUrl,
    })
    // What was said to defend the position stays with the statement
    expect(attached?.argumentIds).toEqual(['arg-1'])
    const created = statementIds()
      .filter((id) => id !== 'deed-media')
      .map(stateOf)
    expect(
      created.map((state) => [state?.statement.positionId, state?.jointDeclarationId]),
    ).toEqual([[onAi.positionId, text.id]])
    // The statements were rewarded when they were added: nothing is earned twice
    expect(grantsIn(journal)).toEqual([])
  })

  it('attaches several statements of the author at once, and creates nothing where one stands', async () => {
    const { attach, journal } = await site({
      'deed-media': deedOf(piketty, onMedia),
      'deed-ai': deedOf(piketty, onAi),
    })
    const before = deedsIn(journal).length

    const result = await attach(['deed-media', 'deed-ai'])

    expect(Either.isRight(result)).toBe(true)
    expect(writtenIn(journal, before)).toEqual([
      ['joint_declaration', 'SignatoryAdded'],
      ['statement', 'StatementJoinedDeclaration'],
      ['statement', 'StatementJoinedDeclaration'],
    ])
  })

  it('lets a statement take the place of the one an earlier signature made on its position', async () => {
    const state = Either.getOrThrow(
      replayJointDeclaration(
        (await journalWithJointDeclarations([text, { positions: [onMedia, onAi] }])).journal
          .all()
          .filter((e) => e.streamType === jointDeclarationStream(text.id).streamType),
      ),
    )!
    const { attach, journal, stateOf } = await site(
      {
        'signed-media': statementAdded(signatureOf(state, piketty, onMedia)),
        'signed-ai': statementAdded(signatureOf(state, piketty, onAi)),
        'deed-media': deedOf(piketty, onMedia),
      },
      [piketty],
    )
    const before = deedsIn(journal).length

    const result = await attach(['deed-media'])

    expect(Either.isRight(result)).toBe(true)
    expect(writtenIn(journal, before)).toEqual([
      ['statement', 'StatementDeleted'],
      ['statement', 'StatementJoinedDeclaration'],
    ])
    expect(stateOf('signed-media')).toBeNull()
    expect(stateOf('signed-ai')?.jointDeclarationId).toBe(text.id)
    expect(stateOf('deed-media')?.jointDeclarationId).toBe(text.id)
  })

  it('refuses a statement on a position the text does not take, and writes nothing', async () => {
    const elsewhere = { subjectId: 'subject-tax', positionId: 'pos-tax', quote: '' }
    const { attach, journal } = await site({ 'deed-tax': deedOf(piketty, elsewhere) })
    const before = deedsIn(journal).length

    const result = await attach(['deed-tax'])

    expect(Either.isLeft(result) && result.left).toBe(TEXT_SILENT_ON_POSITION)
    expect(deedsIn(journal)).toHaveLength(before)
  })

  it('refuses statements of several authors: a signature is one signatory’s', async () => {
    const { attach } = await site({
      'deed-media': deedOf(piketty, onMedia),
      'deed-ai': deedOf(zucman, onAi),
    })
    const result = await attach(['deed-media', 'deed-ai'])
    expect(Either.isLeft(result) && result.left).toBe(SEVERAL_SIGNATORIES)
  })

  it('refuses two statements on the same position: a signature makes one', async () => {
    const { attach } = await site({
      'deed-media': deedOf(piketty, onMedia),
      'other-deed-media': deedOf(piketty, onMedia),
    })
    const result = await attach(['deed-media', 'other-deed-media'])
    expect(Either.isLeft(result) && result.left).toBe(SAME_POSITION_TWICE)
  })

  it('refuses a statement the site does not have, and one that is already a signature', async () => {
    const { attach } = await site({ 'deed-media': deedOf(piketty, onMedia) })
    const unknown = await attach(['unknown'])
    expect(Either.isLeft(unknown) && unknown.left).toBe(ATTACHED_STATEMENT_NOT_FOUND)

    await attach(['deed-media'])
    const again = await attach(['deed-media'])
    expect(Either.isLeft(again) && again.left).toBe(ALREADY_A_SIGNATURE)
  })
})
