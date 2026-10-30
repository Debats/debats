import { Effect, Option } from 'effect'
import { OrganisationMembership } from '../entities/organisation-membership'
import { PublicFigure } from '../entities/public-figure'
import {
  membershipAdded,
  occupationsSet,
  publicFigureAdded,
  publicFigureStream,
} from '../aggregates/public-figure'
import { OccupationAssignmentPayload, PublicFigureEvent } from '../aggregates/public-figure-events'
import { inMemoryUnitOfWork } from '../events/event-store-memory'

/** What a figure's stream holds besides her: her affiliations and her occupations */
export interface FigureHeld {
  occupations?: readonly OccupationAssignmentPayload[]
  memberships?: readonly OrganisationMembership[]
}

const membershipOf = (membership: OrganisationMembership): PublicFigureEvent =>
  membershipAdded({
    membershipId: membership.id,
    organisationId: membership.organisationId,
    role: Option.getOrUndefined(membership.role),
    startedOn: Option.getOrUndefined(membership.startedOn),
    endedOn: Option.getOrUndefined(membership.endedOn),
  })

/** The events a figure's stream holds: the figure, then what she holds */
export const figureEvents = (figure: PublicFigure, held: FigureHeld = {}): PublicFigureEvent[] => [
  publicFigureAdded({
    name: figure.name,
    presentation: figure.presentation,
    notorietySources: figure.notorietySources,
  }),
  ...(held.memberships ?? []).map(membershipOf),
  ...(held.occupations?.length ? [occupationsSet(held.occupations)] : []),
]

/** An in-memory journal where these figures already have their streams, with what they hold */
export async function journalWithFigures(
  ...figures: Array<PublicFigure | [PublicFigure, FigureHeld]>
) {
  const unit = inMemoryUnitOfWork()
  for (const entry of figures) {
    const [figure, held] = Array.isArray(entry) ? entry : [entry, {}]
    await Effect.runPromise(
      unit.journal.append(publicFigureStream(figure.id), 0, figureEvents(figure, held), {
        actorId: figure.createdBy,
      }),
    )
  }
  return unit
}
