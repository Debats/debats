import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { publicFigureAuthor } from '../entities/statement'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import {
  addStatement,
  editStatement,
  importStatement,
  replayStatement,
  setStatementArguments,
  withArgumentReplaced,
} from './statement'

const streamId = '6d1c6c1e-0c7c-4b0e-9b3a-0f1e2d3c4b5a'
const at = (day: string) => new Date(`${day}T10:00:00Z`)

const stored = (
  event: { type: string; payload: unknown },
  revision: number,
  occurredAt: Date,
  actorId: string | null = 'alice',
): StoredEvent => ({
  ...event,
  streamType: 'statement',
  streamId,
  revision,
  actorId,
  metadata: {},
  occurredAt,
})

const added = addStatement({
  author: publicFigureAuthor('figure-1'),
  subjectId: 'subject-1',
  positionId: 'pos-1',
  statementType: 'declaration',
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: at('2024-01-15'),
  argumentIds: ['arg-1'],
})

const edited = editStatement({
  positionId: 'pos-2',
  statementType: 'vote',
  sourceName: 'Assemblée nationale',
  quote: 'Une autre citation suffisamment longue pour être valide.',
  statedAt: at('2024-02-01'),
  argumentIds: ['arg-2', 'arg-3'],
})

describe('statement events', () => {
  it('carries the calendar day and leaves out an empty source url', () => {
    expect(added.payload).toMatchObject({
      statedAt: '2024-01-15',
      sourceUrl: 'https://lemonde.fr/article',
    })
    expect(edited.payload).not.toHaveProperty('sourceUrl')
  })
})

describe('replayStatement', () => {
  it('rebuilds nothing from an empty stream', () => {
    expect(replayStatement([])).toEqual(Either.right(null))
  })

  it('rebuilds the statement from its addition, with the stream id, actor and date', () => {
    const state = replayStatement([stored(added, 1, at('2024-01-16'))])

    expect(Either.isRight(state) && state.right).toMatchObject({
      statement: {
        id: streamId,
        author: { kind: 'public_figure', id: 'figure-1' },
        positionId: 'pos-1',
        sourceUrl: 'https://lemonde.fr/article',
        statedAt: new Date('2024-01-15'),
        createdBy: 'alice',
        createdAt: at('2024-01-16'),
      },
      argumentIds: ['arg-1'],
      deletedAt: null,
    })
  })

  it('applies an edit on top, keeping the author and the creation', () => {
    const state = replayStatement([
      stored(added, 1, at('2024-01-16')),
      stored(edited, 2, at('2024-03-01'), 'bob'),
    ])

    expect(Either.isRight(state) && state.right).toMatchObject({
      statement: {
        author: { kind: 'public_figure', id: 'figure-1' },
        positionId: 'pos-2',
        statementType: 'vote',
        sourceUrl: undefined,
        createdBy: 'alice',
        createdAt: at('2024-01-16'),
        updatedAt: at('2024-03-01'),
      },
      argumentIds: ['arg-2', 'arg-3'],
    })
  })

  it('replaces the arguments, keeping what the statement says', () => {
    const state = replayStatement([
      stored(added, 1, at('2024-01-16')),
      stored(setStatementArguments(['arg-9']), 2, at('2024-04-01')),
    ])
    expect(Either.isRight(state) && state.right).toMatchObject({
      argumentIds: ['arg-9'],
      statement: {
        quote: 'Une citation suffisamment longue pour être valide.',
        updatedAt: at('2024-04-01'),
      },
    })
  })

  it('folds a merged argument into its target without doubling it', () => {
    expect(withArgumentReplaced(['a', 'b'], 'a', 'c')).toEqual(['b', 'c'])
    expect(withArgumentReplaced(['a', 'c'], 'a', 'c')).toEqual(['c'])
  })

  it('marks a deletion', () => {
    const state = replayStatement([
      stored(added, 1, at('2024-01-16')),
      stored({ type: 'StatementDeleted', payload: {} }, 2, at('2024-04-01')),
    ])
    expect(Either.isRight(state) && state.right?.deletedAt).toEqual(at('2024-04-01'))
  })

  it('treats an import like an addition', () => {
    const first = replayStatement([stored(added, 1, at('2024-01-16'))])
    const statement = Either.isRight(first) && first.right ? first.right.statement : null
    const imported = importStatement(statement!, ['arg-1'], 'subject-1')

    expect(imported.type).toBe('StatementImported')
    const again = replayStatement([stored(imported, 1, at('2024-01-16'))])
    expect(Either.isRight(again) && again.right?.statement).toEqual(statement)
    expect(Either.isRight(again) && again.right?.subjectId).toBe('subject-1')
  })

  it('refuses an event it cannot read', () => {
    const state = replayStatement([
      stored({ type: 'StatementAdded', payload: { quote: 1 } }, 1, at('2024-01-16')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
