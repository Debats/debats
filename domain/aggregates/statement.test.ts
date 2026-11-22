import { describe, it, expect } from 'vitest'
import { Either } from 'effect'
import { declarationContent, publicFigureAuthor, voteContent } from '../entities/statement'
import { StoredEvent, UnreadableEvent } from '../events/event-store'
import { Rejected } from './decision'
import {
  addStatement,
  ALREADY_A_SIGNATURE,
  editStatement,
  followSubject,
  joinJointDeclaration,
  moveStatement,
  NOT_THE_POSITION_OF_THE_TEXT,
  NOT_THE_SIGNATORY,
  OTHER_SUBJECT,
  removeStatement,
  replaceArgument,
  replayStatement,
  SIGNED_JOINTLY,
  statementAdded,
  statementArgumentsSet,
  statementDeleted,
  statementEdited,
  statementJoinedDeclaration,
  statementMoved,
  statementMovedToSubject,
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
  content: declarationContent('Une citation suffisamment longue pour être valide.'),
  sourceName: 'Le Monde',
  sourceUrl: 'https://lemonde.fr/article',
  statedAt: at('2024-01-15'),
  argumentIds: ['arg-1'],
}

const added = statementAdded(addition)

const edit = {
  positionId: 'pos-2',
  content: voteContent('Proposition de loi sur la fin de vie', 'contre'),
  sourceName: 'Assemblée nationale',
  sourceUrl: 'https://assemblee-nationale.fr/scrutin',
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
  it('carry the calendar day, the source, and what the statement says by its type', () => {
    expect(added.payload).toMatchObject({
      statedAt: '2024-01-15',
      sourceUrl: 'https://lemonde.fr/article',
      content: { kind: 'declaration', quote: 'Une citation suffisamment longue pour être valide.' },
    })
    expect(edited.payload).toMatchObject({
      sourceUrl: 'https://assemblee-nationale.fr/scrutin',
      content: { kind: 'vote', votedText: 'Proposition de loi sur la fin de vie' },
    })
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

  describe('on a statement that is the signature of a joint declaration', () => {
    const signature = { ...addition, jointDeclarationId: 'declaration-1' }
    const signed = rebuilt(statementAdded(signature))

    it('name the joint declaration it comes from', () => {
      expect(statementAdded(signature).payload.jointDeclarationId).toBe('declaration-1')
      expect(signed.jointDeclarationId).toBe('declaration-1')
      expect(onSubjectOne.jointDeclarationId).toBeNull()
    })

    it('let its arguments change: they are the only thing of its own', () => {
      const otherArguments = { ...addition, argumentIds: ['arg-2', 'arg-3'] }
      expect(editStatement(otherArguments, 'subject-1')(signed)).toEqual(
        Either.right([statementEdited(otherArguments)]),
      )
    })

    it.each([
      ['its position', { positionId: 'pos-2' }],
      ['its words', { content: declarationContent('Une autre citation, tout aussi longue.') }],
      ['its nature', { content: voteContent('Proposition de loi', 'pour') }],
      ['the name of its source', { sourceName: 'Libération' }],
      ['the link to its source', { sourceUrl: 'https://liberation.fr/article' }],
      ['its date', { statedAt: at('2024-01-16') }],
    ])('refuse to change %s: the text says it, for every signatory', (_, change) => {
      expect(editStatement({ ...addition, ...change }, 'subject-1')(signed)).toEqual(
        Either.left(new Rejected(SIGNED_JOINTLY)),
      )
    })
  })

  describe('when found to be the signature of a joint declaration', () => {
    const signature = {
      ...addition,
      content: declarationContent('Les mots du texte qui énoncent la position.'),
      sourceName: 'Manifeste de Paris',
      sourceUrl: 'https://parismanifesto.world',
      statedAt: at('2026-11-21'),
      argumentIds: [],
      jointDeclarationId: 'declaration-1',
    }

    it('take the words, the source and the day of the text, and keep their arguments', () => {
      const decided = joinJointDeclaration(signature)(onSubjectOne)
      expect(decided).toEqual(Either.right([statementJoinedDeclaration(signature)]))

      const joined = rebuilt(added, statementJoinedDeclaration(signature))
      expect(joined.jointDeclarationId).toBe('declaration-1')
      expect(joined.statement).toMatchObject({
        positionId: addition.positionId,
        content: signature.content,
        sourceName: 'Manifeste de Paris',
        sourceUrl: 'https://parismanifesto.world',
        // The day alone is recorded, as for every statement
        statedAt: new Date('2026-11-21'),
      })
      expect(joined.argumentIds).toEqual(onSubjectOne.argumentIds)
    })

    it('refuse a text that takes another position: the statement would say what its author did not', () => {
      expect(joinJointDeclaration({ ...signature, positionId: 'pos-2' })(onSubjectOne)).toEqual(
        Either.left(new Rejected(NOT_THE_POSITION_OF_THE_TEXT)),
      )
    })

    it('refuse another signatory than their author', () => {
      const other = { ...signature, author: publicFigureAuthor('someone-else') }
      expect(joinJointDeclaration(other)(onSubjectOne)).toEqual(
        Either.left(new Rejected(NOT_THE_SIGNATORY)),
      )
    })

    it('refuse a second text: a statement is the signature of one', () => {
      const signed = rebuilt(added, statementJoinedDeclaration(signature))
      expect(joinJointDeclaration(signature)(signed)).toEqual(
        Either.left(new Rejected(ALREADY_A_SIGNATURE)),
      )
    })
  })

  it('follow the position merged into another', () => {
    expect(moveStatement('pos-9')(onSubjectOne)).toEqual([statementMoved('pos-9')])
  })

  it('follow the subject merged into another, onto the position that takes it there', () => {
    const position = onSubjectOne.statement.positionId
    expect(followSubject('subject-2', () => 'pos-9')(onSubjectOne)).toEqual([
      statementMovedToSubject('subject-2', 'pos-9'),
    ])
    expect(followSubject('subject-2', (id) => id)(onSubjectOne)).toEqual([
      statementMovedToSubject('subject-2', position),
    ])
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
        content: { kind: 'vote', votedText: 'Proposition de loi sur la fin de vie' },
        sourceUrl: 'https://assemblee-nationale.fr/scrutin',
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
        content: {
          kind: 'declaration',
          quote: 'Une citation suffisamment longue pour être valide.',
        },
        updatedAt: at('2024-04-01'),
      },
    })
  })

  it('folds a merged argument into its target without doubling it', () => {
    expect(withArgumentReplaced(['a', 'b'], 'a', 'c')).toEqual(['b', 'c'])
    expect(withArgumentReplaced(['a', 'c'], 'a', 'c')).toEqual(['c'])
  })

  it('stands on its new subject once it followed a merge: a position of the old one is refused', () => {
    const moved = rebuilt(added, statementMovedToSubject('subject-2', 'pos-9'))

    expect(moved).toMatchObject({ subjectId: 'subject-2', statement: { positionId: 'pos-9' } })
    expect(editStatement(edit, 'subject-2')(moved)).toEqual(Either.right([edited]))
    expect(editStatement(edit, 'subject-1')(moved)).toEqual(
      Either.left(new Rejected(OTHER_SUBJECT, 'positionId')),
    )
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
