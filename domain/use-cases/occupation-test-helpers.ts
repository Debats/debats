import { Effect } from 'effect'
import { createOccupation, Occupation } from '../entities/occupation'
import { OccupationRepository } from '../repositories/occupation-repository'

export const sampleOccupation = (name = 'Économiste'): Occupation =>
  createOccupation({ name, createdBy: 'founder' })

/** In-memory occupation repository recording the assignments it is asked for */
export function fakeOccupationRepo(seed: Occupation[] = []): OccupationRepository & {
  rows: Occupation[]
  assignments: Map<string, string[]>
} {
  const rows = [...seed]
  const assignments = new Map<string, string[]>()
  return {
    rows,
    assignments,
    findAll: () => Effect.succeed(rows),
    findBySlug: (slug) => Effect.succeed(rows.find((o) => o.slug === slug) ?? null),
    findById: (id) => Effect.succeed(rows.find((o) => o.id === id) ?? null),
    findByIds: (ids) => Effect.succeed(rows.filter((o) => ids.includes(o.id))),
    create: (occupation) => {
      rows.push(occupation)
      return Effect.succeed(occupation)
    },
    update: (occupation) => {
      rows[rows.findIndex((o) => o.id === occupation.id)] = occupation
      return Effect.succeed(occupation)
    },
    delete: (id) => {
      rows.splice(
        rows.findIndex((o) => o.id === id),
        1,
      )
      return Effect.succeed(undefined)
    },
    findByPublicFigureId: (figureId) =>
      Effect.succeed(rows.filter((o) => (assignments.get(figureId) ?? []).includes(o.id))),
    findPublicFigureIdsByOccupationId: (occupationId) =>
      Effect.succeed(
        Array.from(assignments.entries())
          .filter(([, ids]) => ids.includes(occupationId))
          .map(([figureId]) => figureId),
      ),
    setAssignments: (figureId, occupationIds) => {
      assignments.set(figureId, occupationIds)
      return Effect.succeed(undefined)
    },
  }
}
