import { Effect } from 'effect'
import { createOccupation, Occupation } from '../entities/occupation'
import { createOccupationFamily, OccupationFamily } from '../entities/occupation-family'
import {
  addOccupation,
  addOccupationFamily,
  occupationFamilyStream,
} from '../aggregates/occupation-family'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { OccupationRepository } from '../repositories/occupation-repository'
import { OccupationFamilyParts, OccupationFamilySource } from './occupation-family-stream'

export const sampleFamily = (name = 'Chercheur·se et universitaire', position = 1) =>
  createOccupationFamily({ name, position, createdBy: 'founder' })

export const sampleOccupation = (name = 'Économiste', familyId = 'family'): Occupation =>
  createOccupation({ name, familyId, createdBy: 'founder' })

/** In-memory family repository over the given families; writes go through the journal */
export function fakeFamilyRepo(seed: OccupationFamily[] = []): OccupationFamilyRepository {
  return {
    findAll: () => Effect.succeed(seed),
    findBySlug: (slug) => Effect.succeed(seed.find((f) => f.slug === slug) ?? null),
    findById: (id) => Effect.succeed(seed.find((f) => f.id === id) ?? null),
  }
}

/** In-memory occupation repository recording the assignments it is asked for */
export function fakeOccupationRepo(seed: Occupation[] = []): OccupationRepository & {
  assignments: Map<string, OccupationAssignmentInput[]>
} {
  const rows = [...seed]
  const assignments = new Map<string, OccupationAssignmentInput[]>()
  const linksOf = (figureId: string) => assignments.get(figureId) ?? []
  return {
    assignments,
    findAll: () => Effect.succeed(rows),
    findBySlug: (slug) => Effect.succeed(rows.find((o) => o.slug === slug) ?? null),
    findById: (id) => Effect.succeed(rows.find((o) => o.id === id) ?? null),
    findByIds: (ids) => Effect.succeed(rows.filter((o) => ids.includes(o.id))),
    findCurrentHeldByPublicFigureIds: (figureIds) =>
      Effect.succeed(
        figureIds.flatMap((publicFigureId) =>
          linksOf(publicFigureId)
            .filter((link) => link.current)
            .flatMap((link) => {
              const occupation = rows.find((o) => o.id === link.occupationId)
              return occupation ? [{ publicFigureId, occupation }] : []
            }),
        ),
      ),
    findByPublicFigureId: (figureId) =>
      Effect.succeed(
        linksOf(figureId).flatMap(({ occupationId, current }) => {
          const occupation = rows.find((o) => o.id === occupationId)
          return occupation ? [{ occupation, current }] : []
        }),
      ),
    findPublicFigureIdsByOccupationId: (occupationId) =>
      Effect.succeed(
        Array.from(assignments.entries())
          .filter(([, links]) => links.some((l) => l.occupationId === occupationId))
          .map(([figureId]) => figureId),
      ),
    findAllAssignments: () =>
      Effect.succeed(
        Array.from(assignments.entries()).flatMap(([publicFigureId, links]) =>
          links.map(({ occupationId }) => ({ publicFigureId, occupationId })),
        ),
      ),
    findAssignmentsByPublicFigureIds: (figureIds) =>
      Effect.succeed(
        figureIds.flatMap((publicFigureId) =>
          linksOf(publicFigureId).map(({ occupationId }) => ({ publicFigureId, occupationId })),
        ),
      ),
  }
}

/** What the tables would hold of these families, for an import on demand */
export function fakeFamilySource(
  families: OccupationFamily[],
  occupations: Occupation[] = [],
): OccupationFamilySource {
  return (familyId) => {
    const family = families.find((f) => f.id === familyId)
    return Effect.succeed<OccupationFamilyParts | null>(
      family ? { family, occupations: occupations.filter((o) => o.familyId === familyId) } : null,
    )
  }
}

/** An in-memory journal where these families already have their streams, with these occupations */
export async function journalWithFamilies(
  families: OccupationFamily[],
  occupations: Occupation[] = [],
) {
  const unit = inMemoryUnitOfWork()
  for (const family of families) {
    const own = occupations.filter((o) => o.familyId === family.id)
    await Effect.runPromise(
      unit.journal.append(
        occupationFamilyStream(family.id),
        0,
        [addOccupationFamily(family), ...own.map((o) => addOccupation(o.id, o))],
        { actorId: family.createdBy },
      ),
    )
  }
  return unit
}
