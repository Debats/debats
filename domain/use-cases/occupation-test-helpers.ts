import { Effect } from 'effect'
import { createOccupation, Occupation } from '../entities/occupation'
import { createOccupationFamily, OccupationFamily } from '../entities/occupation-family'
import { OccupationAssignmentInput } from '../read-models/occupations'
import { OccupationFamilyRepository } from '../repositories/occupation-family-repository'
import { OccupationRepository } from '../repositories/occupation-repository'

export const sampleFamily = (name = 'Chercheur·se et universitaire', position = 1) =>
  createOccupationFamily({ name, position, createdBy: 'founder' })

export const sampleOccupation = (name = 'Économiste', familyId = 'family'): Occupation =>
  createOccupation({ name, familyId, createdBy: 'founder' })

/** In-memory family repository */
export function fakeFamilyRepo(seed: OccupationFamily[] = []): OccupationFamilyRepository & {
  rows: OccupationFamily[]
} {
  const rows = [...seed]
  return {
    rows,
    findAll: () => Effect.succeed(rows),
    findBySlug: (slug) => Effect.succeed(rows.find((f) => f.slug === slug) ?? null),
    findById: (id) => Effect.succeed(rows.find((f) => f.id === id) ?? null),
    create: (family) => {
      rows.push(family)
      return Effect.succeed(family)
    },
    delete: (id) => {
      rows.splice(
        rows.findIndex((f) => f.id === id),
        1,
      )
      return Effect.succeed(undefined)
    },
  }
}

/** In-memory occupation repository recording the assignments it is asked for */
export function fakeOccupationRepo(seed: Occupation[] = []): OccupationRepository & {
  rows: Occupation[]
  assignments: Map<string, OccupationAssignmentInput[]>
} {
  const rows = [...seed]
  const assignments = new Map<string, OccupationAssignmentInput[]>()
  const linksOf = (figureId: string) => assignments.get(figureId) ?? []
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
