/**
 * How the admin API reads a JSON body: an object whose fields are all known,
 * text fields trimmed with blanks read as empty, days as YYYY-MM-DD. The
 * messages are the API's contract, so every route says the same thing.
 */

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** The body as an object, refusing anything else and any field not expected */
export function objectWithFields(
  body: unknown,
  fields: ReadonlySet<string>,
): { input: Record<string, unknown> } | { error: string } {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return { error: 'Expected a JSON object.' }
  }
  const input = body as Record<string, unknown>
  const unknown = Object.keys(input).filter((key) => !fields.has(key))
  if (unknown.length > 0) return { error: `Unknown fields: ${unknown.join(', ')}` }
  return { input }
}

/** A text field, trimmed; absent or null reads as empty */
export function textField(value: unknown, field: string): { text: string } | { error: string } {
  if (value === undefined || value === null) return { text: '' }
  if (typeof value !== 'string') return { error: `Field ${field} must be a string` }
  return { text: value.trim() }
}

/** A day field, YYYY-MM-DD; absent, null or blank reads as empty */
export function dayField(value: unknown, field: string): { day: string } | { error: string } {
  const read = textField(value, field)
  if ('error' in read) return read
  if (read.text && !ISO_DATE.test(read.text)) {
    return { error: `Field ${field} must be a date (YYYY-MM-DD)` }
  }
  return { day: read.text }
}
