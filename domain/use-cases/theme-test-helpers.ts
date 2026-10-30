import { Effect } from 'effect'
import { createTheme } from '../entities/entity-test-helpers'
import { Theme } from '../entities/theme'
import { themeAdded, themeStream } from '../aggregates/theme'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { ThemeRepository } from '../repositories/theme-repository'

export const sampleTheme = (name = 'Économie'): Theme =>
  createTheme({
    name,
    description: 'Fiscalité, emploi, finances publiques, marché du travail',
    createdBy: 'founder',
  })

/** In-memory theme repository over the given themes; links are stubbed empty */
export function fakeThemeRepo(seed: Theme[] = []): ThemeRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((t) => t.slug === slug) ?? null),
    findById: (id) => Effect.succeed(seed.find((t) => t.id === id) ?? null),
    findByIds: (ids) => Effect.succeed(seed.filter((t) => ids.includes(t.id))),
    findAllPrimaryLinks: () => Effect.succeed([]),
    findSubjectIdsByThemeId: () => Effect.succeed([]),
    findAssignmentsBySubjectId: () => Effect.succeed([]),
  }
}

/** An in-memory journal where these themes already have their streams */
export async function journalWithThemes(...seed: Theme[]) {
  const unit = inMemoryUnitOfWork()
  for (const theme of seed) {
    await Effect.runPromise(
      unit.journal.append(themeStream(theme.id), 0, [themeAdded(theme)], {
        actorId: theme.createdBy,
      }),
    )
  }
  return unit
}
