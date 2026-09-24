import * as S from 'effect/Schema'
import { Option } from 'effect'

export const MembershipId = S.String.pipe(S.brand('MembershipId'))
export type MembershipId = S.Schema.Type<typeof MembershipId>

/**
 * A public figure's affiliation to an organisation: member, elected official,
 * spokesperson, employee… The period is optional; an open-ended membership
 * (no end date) is a current one.
 */
export const OrganisationMembership = S.Struct({
  id: MembershipId,
  organisationId: S.String,
  publicFigureId: S.String,
  role: S.Option(S.String.pipe(S.maxLength(100))),
  startedOn: S.Option(S.Date),
  endedOn: S.Option(S.Date),
  createdBy: S.String,
  updatedBy: S.String,
  createdAt: S.Date,
  updatedAt: S.Date,
}).pipe(
  S.filter(
    (membership) =>
      Option.isNone(membership.startedOn) ||
      Option.isNone(membership.endedOn) ||
      membership.endedOn.value >= membership.startedOn.value,
    { message: () => 'The membership cannot end before it started' },
  ),
)

export type OrganisationMembership = S.Schema.Type<typeof OrganisationMembership>

export const createMembership = (params: {
  organisationId: string
  publicFigureId: string
  role?: string
  startedOn?: Date
  endedOn?: Date
  createdBy: string
}): OrganisationMembership => {
  const now = new Date()
  const role = params.role?.trim() ?? ''

  return OrganisationMembership.make({
    id: MembershipId.make(crypto.randomUUID()),
    organisationId: params.organisationId,
    publicFigureId: params.publicFigureId,
    role: role ? Option.some(role) : Option.none(),
    startedOn: Option.fromNullable(params.startedOn),
    endedOn: Option.fromNullable(params.endedOn),
    createdBy: params.createdBy,
    updatedBy: params.createdBy,
    createdAt: now,
    updatedAt: now,
  })
}

/** A membership is current until its end date, if any, is past. */
export const isCurrentMembership = (
  membership: OrganisationMembership,
  today: Date = new Date(),
): boolean =>
  Option.match(membership.endedOn, { onNone: () => true, onSome: (end) => end >= today })
