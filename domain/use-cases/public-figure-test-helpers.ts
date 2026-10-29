import { Effect } from 'effect'
import { OrganisationMembership } from '../entities/organisation-membership'
import { PublicFigure } from '../entities/public-figure'
import { publicFigureAdded, publicFigureStream } from '../aggregates/public-figure'
import { OccupationAssignmentPayload } from '../aggregates/public-figure-events'
import { inMemoryUnitOfWork } from '../events/event-store-memory'
import { PublicFigureParts, PublicFigureSource } from './public-figure-stream'

/** What the tables would hold of these figures, for an import on demand */
export function fakePublicFigureSource(parts: PublicFigureParts[]): PublicFigureSource {
  return (publicFigureId) =>
    Effect.succeed(parts.find((p) => p.figure.id === publicFigureId) ?? null)
}

export const figureParts = (
  figure: PublicFigure,
  held: {
    occupations?: readonly OccupationAssignmentPayload[]
    memberships?: readonly OrganisationMembership[]
  } = {},
): PublicFigureParts => ({
  figure,
  occupations: held.occupations ?? [],
  memberships: held.memberships ?? [],
})

/** An in-memory journal where these figures already have their streams */
export async function journalWithFigures(...figures: PublicFigure[]) {
  const unit = inMemoryUnitOfWork()
  for (const figure of figures) {
    await Effect.runPromise(
      unit.journal.append(
        publicFigureStream(figure.id),
        0,
        [
          publicFigureAdded({
            name: figure.name,
            presentation: figure.presentation,
            notorietySources: figure.notorietySources,
          }),
        ],
        { actorId: figure.createdBy },
      ),
    )
  }
  return unit
}
