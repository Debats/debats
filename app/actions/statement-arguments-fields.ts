import { StatementArgumentsInput } from '../../domain/use-cases/statement-arguments'

/**
 * Reads the arguments part of a statement form: the checked existing
 * arguments (`argumentIds`) and the proposed ones (`newArguments`, a JSON
 * array of { title, description }). Anything malformed is ignored here; the
 * use case validates what remains.
 */
export function readStatementArguments(formData: FormData): StatementArgumentsInput {
  const argumentIds = formData
    .getAll('argumentIds')
    .map((value) => String(value).trim())
    .filter((value) => value.length > 0)

  let newArguments: StatementArgumentsInput['newArguments'] = []
  const raw = formData.get('newArguments')
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        newArguments = parsed.flatMap((item) =>
          item && typeof item === 'object' && 'title' in item && 'description' in item
            ? [{ title: String(item.title), description: String(item.description) }]
            : [],
        )
      }
    } catch {
      newArguments = []
    }
  }

  return { argumentIds, newArguments }
}
