import { Effect } from 'effect'
import { Argument, createArgument } from '../entities/argument'
import { ArgumentRepository } from '../repositories/argument-repository'

export const sampleArgument = (subjectId = 'subject-1', title = 'Coût budgétaire'): Argument =>
  createArgument({
    subjectId,
    title,
    description: 'La mesure pèserait durablement sur le budget de l’État.',
    createdBy: 'founder',
  })

/** In-memory argument repository recording the links it is asked to set */
export function fakeArgumentRepo(seed: Argument[] = []): ArgumentRepository & {
  rows: Argument[]
  links: Map<string, string[]>
} {
  const rows = [...seed]
  const links = new Map<string, string[]>()
  return {
    rows,
    links,
    findBySubjectId: (subjectId) => Effect.succeed(rows.filter((a) => a.subjectId === subjectId)),
    findByIds: (ids) => Effect.succeed(rows.filter((a) => ids.includes(a.id))),
    findIdsByStatementId: (statementId) => Effect.succeed(links.get(statementId) ?? []),
    create: (argument) => {
      rows.push(argument)
      return Effect.succeed(argument)
    },
    setStatementArguments: (statementId, argumentIds) => {
      links.set(statementId, argumentIds)
      return Effect.succeed(undefined)
    },
  }
}
