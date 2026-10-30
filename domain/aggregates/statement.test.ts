import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { publicFigureAuthor } from '../entities/statement'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  addStatement,
  editStatement,
  moveStatement,
  OTHER_SUBJECT,
  removeStatement,
  replaceArgument,
  replayStatement,
  statementAdded,
  statementArgumentsSet,
  statementDeleted,
  statementEdited,
  statementMoved,
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

const addition = {
  author: publicFigureAuthor('figure-1'),
  subjectId: 'subject-1',
  positionId: 'pos-1',
  statementType: 'declaration' as const,
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  quote: 'Une citation suffisamment longue pour être valide.',
  statedAt: at('2024-01-15'),
  argumentIds: ['arg-1'],
}

const added = statementAdded(addition)

const edit = {
  positionId: 'pos-2',
  statementType: 'vote' as const,
  sourceName: 'Assemblée nationale',
  quote: 'Une autre citation suffisamment longue pour être valide.',
  statedAt: at('2024-02-01'),
  argumentIds: ['arg-2', 'arg-3'],
}

const edited = statementEdited(edit)

const rebuilt = (...events: Array<{ type: string; payload: unknown }>) => {
  const state = replayStatement(
    events.map((event, index) => stored(event, index + 1, at(`2024-01-${16 + index}`))),
  )
  if (Either.isLeft(state) || !state.right) throw new Error('expected a state')
  return state.right
}

describe('statement facts', () => {
  it('carry the calendar day and leave out an empty source url', () => {
    expect(added.payload).toMatchObject({
      statedAt: '2024-01-15',
      sourceUrl: 'https://lemonde.fr/article',
    })
    expect(edited.payload).not.toHaveProperty('sourceUrl')
  })
})

describe('statement decisions', () => {
  const onSubjectOne = rebuilt(added)

  it('open the stream with the statement added', () => {
    expect(addStatement(addition)).toEqual([added])
  })

  it('edit the statement for a position on its subject', () => {
    expect(editStatement(edit, 'subject-1')(onSubjectOne)).toEqual(Either.right([edited]))
  })

  it('refuse a position on another subject, blaming the position field', () => {
    expect(editStatement(edit, 'subject-2')(onSubjectOne)).toEqual(
      Either.left(new Rejected(OTHER_SUBJECT, 'positionId')),
    )
  })

  it('let a stream opened before it named its subject take any position', () => {
    const unnamed = rebuilt({ ...added, payload: { ...added.payload, subjectId: undefined } })
    expect(editStatement(edit, 'subject-2')(unnamed)).toEqual(Either.right([edited]))
  })

  it('follow the position merged into another', () => {
    expect(moveStatement('pos-9')(onSubjectOne)).toEqual([statementMoved('pos-9')])
  })

  it('go away with the subject', () => {
    expect(removeStatement()(onSubjectOne)).toEqual([statementDeleted()])
  })

  it('follow an argument merged into another, only when mobilised', () => {
    expect(replaceArgument('arg-1', 'arg-7')(onSubjectOne)).toEqual([
      statementArgumentsSet(['arg-7']),
    ])
    expect(replaceArgument('arg-5', 'arg-7')(onSubjectOne)).toEqual([])
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
      stored(statementArgumentsSet(['arg-9']), 2, at('2024-04-01')),
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
      stored(statementDeleted(), 2, at('2024-04-01')),
    ])
    expect(Either.isRight(state) && state.right?.deletedAt).toEqual(at('2024-04-01'))
  })

  it('refuses an event it cannot read', () => {
    const state = replayStatement([
      stored({ type: 'StatementAdded', payload: { quote: 1 } }, 1, at('2024-01-16')),
    ])
    expect(Either.isLeft(state) && state.left).toBeInstanceOf(UnreadableEvent)
  })
})
