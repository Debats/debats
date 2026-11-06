import { StatementArgumentsInput } from '../../domain/use-cases/statement-arguments'

const NONE: StatementArgumentsInput = { argumentIds: [], newArguments: [] }

/** Des identifiants : ce qui n'est pas une chaîne utile est écarté */
const idsOf = (values: readonly unknown[]): string[] =>
  values.map((value) => String(value).trim()).filter((value) => value.length > 0)

/** Des arguments proposés : un élément sans titre ni description n'en est pas un */
const proposedOf = (value: unknown): StatementArgumentsInput['newArguments'] =>
  Array.isArray(value)
    ? value.flatMap((item) =>
        item && typeof item === 'object' && 'title' in item && 'description' in item
          ? [{ title: String(item.title), description: String(item.description) }]
          : [],
      )
    : []

/**
 * Ramène à la forme attendue ce qu'un client dit être la partie arguments
 * d'une prise de position.
 *
 * Une Server Function reçoit du JSON, pas le type qu'elle déclare : le domaine
 * parcourt ces deux tableaux sans les interroger, donc c'est ici — à la
 * frontière — qu'on s'assure qu'il en reçoit bien deux.
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
 * Lit la partie arguments d'un formulaire dans ses champs cachés : les
 * arguments cochés (`argumentIds`) et ceux proposés (`newArguments`, un
 * tableau JSON de { title, description }).
 *
 * Il vit dans `lib/forms` parce que les deux côtés le lisent : le formulaire
 * de contribution, qui envoie un objet typé et compose donc dans le
 * navigateur, et les actions encore nourries par un FormData.
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
