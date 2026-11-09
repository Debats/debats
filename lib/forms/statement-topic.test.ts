import { describe, expect, it } from 'vitest'
import { statementTopicOf } from './statement-topic'

const SUBJECT_ID = '7c1e4b2a-3d5f-4a8c-9b0e-2f3a4b5c6d7e'

/** What actually reaches a Server Function has no type */
const asSent = (value: unknown) => value

const EMPTY = {
  kind: 'existing',
  subjectId: '',
  position: { kind: 'existing', id: '' },
}

describe('statementTopicOf', () => {
  it('keeps a subject and the position ticked on it', () => {
    expect(
      statementTopicOf(
        asSent({
          kind: 'existing',
          subjectId: SUBJECT_ID,
          position: { kind: 'existing', id: 'pos-1' },
        }),
      ),
    ).toEqual({
      kind: 'existing',
      subjectId: SUBJECT_ID,
      position: { kind: 'existing', id: 'pos-1' },
    })
  })

  it('keeps a position proposed on a subject of the site', () => {
    expect(
      statementTopicOf(
        asSent({
          kind: 'existing',
          subjectId: SUBJECT_ID,
          position: {
            kind: 'new',
            positionTitle: 'Pour une hausse',
            positionDescription: 'Le salaire minimum doit suivre le coût de la vie.',
          },
        }),
      ),
    ).toEqual({
      kind: 'existing',
      subjectId: SUBJECT_ID,
      position: {
        kind: 'new',
        positionTitle: 'Pour une hausse',
        positionDescription: 'Le salaire minimum doit suivre le coût de la vie.',
      },
    })
  })

  it('keeps a subject to create with its first position', () => {
    expect(
      statementTopicOf(
        asSent({
          kind: 'new',
          subject: {
            title: 'Le montant du SMIC',
            presentation: 'Le salaire minimum légal.',
            problem: 'Faut-il l’augmenter ?',
          },
          position: {
            kind: 'new',
            positionTitle: 'Pour une hausse',
            positionDescription: 'Il doit suivre le coût de la vie.',
          },
        }),
      ),
    ).toEqual({
      kind: 'new',
      subject: {
        title: 'Le montant du SMIC',
        presentation: 'Le salaire minimum légal.',
        problem: 'Faut-il l’augmenter ?',
      },
      position: {
        positionTitle: 'Pour une hausse',
        positionDescription: 'Il doit suivre le coût de la vie.',
      },
    })
  })

  /*
   * The command reads `kind` to tell a subject it has to create from one it
   * has to find, and reads each payload as given. Without this pass, an
   * unknown kind fell into the « existing » branch and broke on a position
   * that was not there — a 500 where a refusal is due.
   */
  it('brings an unknown kind back to an empty choice', () => {
    expect(statementTopicOf(asSent({ kind: 'borrowed', subject: {} }))).toEqual(EMPTY)
  })

  it('brings nothing at all back to an empty choice', () => {
    expect(statementTopicOf(asSent(undefined))).toEqual(EMPTY)
    expect(statementTopicOf(asSent('a string'))).toEqual(EMPTY)
    expect(statementTopicOf(asSent({ kind: 'existing' }))).toEqual(EMPTY)
  })

  it('brings a creation with no payload back to empty fields, which the schemas refuse', () => {
    expect(statementTopicOf(asSent({ kind: 'new' }))).toEqual({
      kind: 'new',
      subject: { title: '', presentation: '', problem: '' },
      position: { positionTitle: '', positionDescription: '' },
    })
    expect(statementTopicOf(asSent({ kind: 'new', subject: null, position: 42 }))).toEqual({
      kind: 'new',
      subject: { title: '', presentation: '', problem: '' },
      position: { positionTitle: '', positionDescription: '' },
    })
  })

  /*
   * The union says a subject created here brings its own first position. A
   * client cannot ask the command to create a subject and then look for a
   * position on it that cannot exist.
   */
  it('gives a subject to create a position to create, whatever was sent beside it', () => {
    const topic = statementTopicOf(
      asSent({
        kind: 'new',
        subject: { title: 'X', presentation: 'Y', problem: 'Z' },
        position: { kind: 'existing', id: 'pos-1' },
      }),
    )

    expect(topic.kind).toBe('new')
    expect(topic).toEqual({
      kind: 'new',
      subject: { title: 'X', presentation: 'Y', problem: 'Z' },
      position: { positionTitle: '', positionDescription: '' },
    })
  })

  it('reads what is not a string as one', () => {
    expect(
      statementTopicOf(asSent({ kind: 'existing', subjectId: 42, position: { id: null } })),
    ).toEqual({ kind: 'existing', subjectId: '42', position: { kind: 'existing', id: '' } })
  })
})
