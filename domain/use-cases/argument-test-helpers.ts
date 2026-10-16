import { Effect } from 'effect'
import { Argument, createArgument, sameArgumentTitle } from '../entities/argument'
import { ArgumentRepository } from '../repositories/argument-repository'

export const sampleArgument = (title = 'Coût budgétaire'): Argument =>
  createArgument({
    title,
    description: 'La mesure pèserait durablement sur le budget de l’État.',
    createdBy: 'founder',
  })

/** In-memory argument repository recording the links and merges it is asked for */
export function fakeArgumentRepo(seed: Argument[] = []): ArgumentRepository & {
  rows: Argument[]
  links: Map<string, string[]>
  merges: Array<{ sourceId: string; targetId: string }>
} {
  const rows = [...seed]
  const links = new Map<string, string[]>()
  const merges: Array<{ sourceId: string; targetId: string }> = []
  const toRef = (a: Argument) => ({ id: a.id, title: a.title, slug: a.slug })
  return {
    rows,
    links,
    merges,
    findById: (id) => Effect.succeed(rows.find((a) => a.id === id) ?? null),
    findBySlug: (slug) => Effect.succeed(rows.find((a) => a.slug === slug) ?? null),
    findByIds: (ids) => Effect.succeed(rows.filter((a) => ids.includes(a.id))),
    findByTitle: (title) =>
      Effect.succeed(rows.find((a) => sameArgumentTitle(a.title, title)) ?? null),
    search: (query) =>
      Effect.succeed(
        rows
          .filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))
          .map((a) => ({ ...toRef(a), statementsCount: 0 })),
      ),
    findSummaries: () =>
      Effect.succeed(
        rows.map((a) => ({
          ...toRef(a),
          description: a.description,
          statementsCount: 0,
          subjectsCount: 0,
        })),
      ),
    findRefsByStatementId: (statementId) =>
      Effect.succeed(
        (links.get(statementId) ?? []).flatMap((id) => {
          const argument = rows.find((a) => a.id === id)
          return argument ? [toRef(argument)] : []
        }),
      ),
    create: (argument) => {
      rows.push(argument)
      return Effect.succeed(argument)
    },
    update: (argument) => {
      const index = rows.findIndex((a) => a.id === argument.id)
      rows[index] = argument
      return Effect.succeed(argument)
    },
    setStatementArguments: (statementId, argumentIds) => {
      links.set(statementId, argumentIds)
      return Effect.succeed(undefined)
    },
    mergeInto: (sourceId, targetId) => {
      merges.push({ sourceId, targetId })
      return Effect.succeed(undefined)
    },
    delete: () => Effect.succeed(undefined),
  }
}
