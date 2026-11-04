/**
 * What the admin API accepts to correct a statement already on the site: the
 * fields of the edit form, each optional, the content whole (its kind says
 * which fields it carries), the arguments as the full list of titles the
 * statement mobilises after the correction. Whether the correction holds up
 * (position on the same subject, quote long enough) is the command's judgement.
 */
import { StatementContent } from '../../../domain/entities/statement'
import { NewArgumentInput } from '../../../domain/use-cases/statement-arguments'
import { parseDraftContent } from '../drafts/validation'
import { dayField, objectWithFields, textField } from '../json-input'

export type StatementPatch = {
  content?: StatementContent
  sourceName?: string
  sourceUrl?: string
  statedAt?: string
  /** The slug of a position of the statement's subject */
  position?: string
  /** Every argument the statement mobilises after the correction; a title already on the site is reused */
  arguments?: NewArgumentInput[]
}

const FIELDS: ReadonlySet<string> = new Set([
  'content',
  'sourceName',
  'sourceUrl',
  'statedAt',
  'position',
  'arguments',
])

const ARGUMENTS_ERROR =
  'Field arguments must be an array of titles or { title, description } objects'

function argumentOf(value: unknown): NewArgumentInput | null {
  if (typeof value === 'string') return { title: value.trim(), description: '' }
  if (typeof value !== 'object' || value === null) return null
  const { title, description } = value as Record<string, unknown>
  if (typeof title !== 'string') return null
  if (description !== undefined && description !== null && typeof description !== 'string') {
    return null
  }
  return { title: title.trim(), description: (description ?? '').trim() }
}

function argumentsOf(value: unknown): { arguments: NewArgumentInput[] } | { error: string } {
  if (!Array.isArray(value)) return { error: ARGUMENTS_ERROR }
  const parsed = value.map(argumentOf)
  if (parsed.some((argument) => argument === null)) return { error: ARGUMENTS_ERROR }
  return { arguments: parsed as NewArgumentInput[] }
}

function requiredText(value: unknown, field: string): { text: string } | { error: string } {
  const read = textField(value, field)
  if ('error' in read) return read
  if (read.text === '') return { error: `Field ${field} cannot be blank` }
  return read
}

/** Only the fields sent: what a correction takes, the rest staying as it is. */
export function parseStatementPatch(body: unknown): { patch: StatementPatch } | { error: string } {
  const read = objectWithFields(body, FIELDS)
  if ('error' in read) return read
  const { input } = read
  if (Object.keys(input).length === 0) {
    return { error: 'Nothing to change: send at least one field' }
  }

  const patch: StatementPatch = {}
  if ('content' in input) {
    const content = parseDraftContent(input.content)
    if ('error' in content) return content
    patch.content = content.content
  }
  for (const field of ['sourceName', 'sourceUrl'] as const) {
    if (!(field in input)) continue
    const text = requiredText(input[field], field)
    if ('error' in text) return text
    patch[field] = text.text
  }
  if ('statedAt' in input) {
    const day = dayField(input.statedAt, 'statedAt')
    if ('error' in day) return day
    patch.statedAt = day.day
  }
  if ('position' in input) {
    const slug = textField(input.position, 'position')
    if ('error' in slug || slug.text === '') {
      return { error: 'Field position must be the slug of a position of the same subject' }
    }
    patch.position = slug.text
  }
  if ('arguments' in input) {
    const list = argumentsOf(input.arguments)
    if ('error' in list) return list
    patch.arguments = list.arguments
  }
  return { patch }
}
