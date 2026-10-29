import { Effect } from 'effect'
import { Argument, sameArgumentTitle } from '../entities/argument'
import { createArgument } from '../entities/entity-test-helpers'
import { argumentAdded, argumentStream } from '../aggregates/argument'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ArgumentParts, ArgumentSource } from './argument-stream'

export const sampleArgument = (title = 'Coût budgétaire'): Argument =>
  createArgument({
    title,
    description: 'La mesure pèserait durablement sur le budget de l’État.',
    createdBy: 'founder',
  })

/** In-memory argument repository over the given arguments; links are stubbed empty */
export function fakeArgumentRepo(seed: Argument[] = []): ArgumentRepository {
  const toRef = (a: Argument) => ({ id: a.id, title: a.title, slug: a.slug })
  return {
    findById: (id) => Effect.succeed(seed.find((a) => a.id === id) ?? null),
    findBySlug: (slug) => Effect.succeed(seed.find((a) => a.slug === slug) ?? null),
    findByIds: (ids) => Effect.succeed(seed.filter((a) => ids.includes(a.id))),
    findByTitle: (title) =>
      Effect.succeed(seed.find((a) => sameArgumentTitle(a.title, title)) ?? null),
    search: (query) =>
      Effect.succeed(
        seed
          .filter((a) => a.title.toLowerCase().includes(query.toLowerCase()))
          .map((a) => ({ ...toRef(a), statementsCount: 0 })),
      ),
    findSummaries: () =>
      Effect.succeed(
        seed.map((a) => ({
          ...toRef(a),
          description: a.description,
          statementsCount: 0,
          subjectsCount: 0,
        })),
      ),
    findRefsByStatementId: () => Effect.succeed([]),
  }
}

/** What the tables would hold of these arguments, for an import on demand */
export function fakeArgumentSource(seed: Argument[]): ArgumentSource {
  return (argumentId) => {
    const argument = seed.find((a) => a.id === argumentId)
    return Effect.succeed<ArgumentParts | null>(argument ? { argument } : null)
  }
}

/** An in-memory journal where these arguments already have their streams */
export async function journalWithArguments(...seed: Argument[]) {
  const unit = inMemoryUnitOfWork()
  for (const argument of seed) {
    await Effect.runPromise(
      unit.journal.append(argumentStream(argument.id), 0, [argumentAdded(argument)], {
        actorId: argument.createdBy,
      }),
    )
  }
  return unit
}
