import { StatementArgumentsInput } from '../../domain/use-cases/statement-arguments'

const NONE: StatementArgumentsInput = { argumentIds: [], newArguments: [] }

/** Ids: what is not a useful string is dropped */
const idsOf = (values: readonly unknown[]): string[] =>
  values.map((value) => String(value).trim()).filter((value) => value.length > 0)

/** Proposed arguments: an item with neither title nor description is not one */
const proposedOf = (value: unknown): StatementArgumentsInput['newArguments'] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        item && typeof item === 'object' && 'title' in item && 'description' in item
          ? [{ title: String(item.title), description: String(item.description) }]
          : [],
      )
    : []

/**
 * Brings back to its expected shape what a client says is the arguments part
 * of a statement.
 *
 * A Server Function receives JSON, not the type it declares: the domain walks
 * through these two arrays without questioning them, so this is where — at
 * the boundary — we make sure it does receive two.
 */
export function statementArgumentsOf(value: unknown): StatementArgumentsInput {
  if (!value || typeof value !== 'object') return NONE
  const { argumentIds, newArguments } = value as Record<string, unknown>
  return {
    argumentIds: Array.isArray(argumentIds) ? idsOf(argumentIds) : [],
    newArguments: proposedOf(newArguments),
  }
}

/**
 * Reads the arguments part of a form from its hidden fields: the ticked
 * arguments (`argumentIds`) and the proposed ones (`newArguments`, a JSON
 * array of { title, description }).
 *
 * It lives in `lib/forms` because both sides read it: the contribution form,
 * which sends a typed object and therefore composes in the browser, and the
 * actions still fed by a FormData.
 */
export function readStatementArguments(fields: FormData): StatementArgumentsInput {
  const raw = fields.get('newArguments')
  let parsed: unknown = []
  if (typeof raw === 'string' && raw.trim()) {
    try {
      parsed = JSON.parse(raw)
    } catch {
      parsed = []
    }
  }

  return {
    argumentIds: idsOf(fields.getAll('argumentIds')),
    newArguments: proposedOf(parsed),
  }
}
