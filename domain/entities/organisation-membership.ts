import * as S from 'effect/Schema'
import { Option } from 'effect'
import { dayOf } from '../value-objects/day'

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

/**
 * A membership runs until the end of the day its end date names; one without
 * an end date runs on. A period that has not opened yet is read as running
 * too: nothing on this site is announced for later, and an affiliation to come
 * belongs with the running ones rather than with those that have ended.
 * The day to judge on comes from the caller: the domain never reads the clock.
 */
export const isCurrentMembership = (
  membership: Pick<OrganisationMembership, 'endedOn'>,
  today: Date,
): boolean =>
  Option.match(membership.endedOn, { onNone: () => true, onSome: (end) => end >= dayOf(today) })
