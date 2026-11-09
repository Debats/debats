import { StatementPositionInput, StatementTopic } from '../../domain/use-cases/create-statement'

const fields = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const text = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''))

/** A subject chosen, with nothing chosen on it: the reads refuse it by field */
const NONE: StatementTopic = {
  kind: 'existing',
  subjectId: '',
  position: { kind: 'existing', id: '' },
}

/** The position of a subject that already exists: the one ticked, or one to create */
const positionOf = (value: unknown): StatementPositionInput => {
  const position = fields(value)
  return position.kind === 'new'
    ? {
        kind: 'new',
        positionTitle: text(position.positionTitle),
        positionDescription: text(position.positionDescription),
      }
    : { kind: 'existing', id: text(position.id) }
}

/**
 * Brings back to its expected shape what a client says the statement is about.
 *
 * A Server Function receives JSON, not the type it declares. The command
 * reads `kind` to tell a subject it has to create from one it has to find,
 * and reads the payload of each without questioning it: without this pass, an
 * unknown kind fell into the « existing » branch and broke on a position that
 * was not there — a 500 where a refusal is due.
 *
 * What is brought back here is not judged here: an empty id fails on the read
 * that does not find it, and empty fields on the schemas that measure them.
 * A new subject keeps its new position, because the union says it must —
 * nothing a client sends can make the command create a subject and then look
 * for a position on it that cannot exist.
 */
export function statementTopicOf(value: unknown): StatementTopic {
  if (!value || typeof value !== 'object') return NONE
  const topic = value as Record<string, unknown>

  if (topic.kind !== 'new') {
    return {
      kind: 'existing',
      subjectId: text(topic.subjectId),
      position: positionOf(topic.position),
    }
  }

  const subject = fields(topic.subject)
  const position = fields(topic.position)
  return {
    kind: 'new',
    subject: {
      title: text(subject.title),
      presentation: text(subject.presentation),
      problem: text(subject.problem),
    },
    position: {
      positionTitle: text(position.positionTitle),
      positionDescription: text(position.positionDescription),
    },
  }
}
