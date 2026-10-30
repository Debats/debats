import { StatementContentInput } from '../../domain/use-cases/validate-statement-fields'

const field = (formData: FormData, name: string) => String(formData.get(name) ?? '')

/**
 * Reads every content field the form can hold. Which ones matter is decided by
 * the type, in the domain — the action does not choose.
 */
export function readStatementContent(formData: FormData): StatementContentInput {
  return {
    statementType: field(formData, 'statementType'),
    quote: field(formData, 'quote'),
    document: field(formData, 'document'),
    votedText: field(formData, 'votedText'),
    choice: field(formData, 'choice'),
    deed: field(formData, 'deed'),
  }
}
