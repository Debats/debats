import { Effect, pipe } from 'effect'
import { MembershipId } from '../entities/organisation-membership'
import { addMembership } from '../aggregates/public-figure'
import { runUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { allowedTo, faultless, found } from './preconditions'
import { decideOnPublicFigure, writtenMembership } from './public-figure-stream'

export type AddOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  organisationId: string
  publicFigureId: string
  role: string
  /** ISO date (YYYY-MM-DD) or empty */
  startedOn: string
  /** ISO date (YYYY-MM-DD) or empty */
  endedOn: string
}

export type { FieldErrors }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const ROLE_MAX = 100

/** Read side: the organisation and the figure must exist */
const organisations = Effect.serviceFunctions(OrganisationRepository)
const figures = Effect.serviceFunctions(PublicFigureRepository)

/** Parses an optional ISO date field; `undefined` when empty, `null` when malformed. */
function parseOptionalDate(value: string): Date | undefined | null {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!ISO_DATE.test(trimmed)) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

/** The faults of the form, gathered: the figure, the role, the period */
function membershipFaults(
  figureKnown: boolean,
  role: string,
  startedOn: Date | undefined | null,
  endedOn: Date | undefined | null,
): FieldErrors {
  return {
    ...(figureKnown ? {} : { publicFigureId: 'Choisissez une personnalité.' }),
    ...(role.length > ROLE_MAX
      ? { role: `Le rôle ne doit pas dépasser ${ROLE_MAX} caractères.` }
      : {}),
    ...(startedOn === null ? { startedOn: 'La date de début est invalide.' } : {}),
    ...(endedOn === null
      ? { endedOn: 'La date de fin est invalide.' }
      : startedOn && endedOn && endedOn < startedOn
        ? { endedOn: 'La date de fin doit être postérieure à la date de début.' }
        : {}),
  }
}

/**
 * Affiliates a public figure to an organisation, with an optional role and
 * period. The affiliation lives in the figure's stream; a current one to the
 * same organisation is refused.
 */
export function addOrganisationMembershipUseCase(params: AddOrganisationMembershipParams) {
  const { organisationId, publicFigureId } = params
  const role = params.role.trim()
  const startedOn = parseOptionalDate(params.startedOn)
  const endedOn = parseOptionalDate(params.endedOn)
  const membershipId = MembershipId.make(crypto.randomUUID())

  const figureKnown = publicFigureId
    ? Effect.map(figures.findById(publicFigureId), (figure) => figure !== null)
    : Effect.succeed(false)

  return pipe(
    allowedTo(params.contributor, 'add_membership', 'affilier une personnalité'),
    Effect.tap(() =>
      Effect.flatMap(
        organisations.findById(organisationId),
        found('Cette organisation est introuvable.'),
      ),
    ),
    Effect.tap(() =>
      Effect.flatMap(figureKnown, (known) =>
        faultless(membershipFaults(known, role, startedOn, endedOn)),
      ),
    ),
    Effect.flatMap((contributor) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnPublicFigure(
            events,
            publicFigureId,
            contributor.id,
            addMembership({
              membershipId,
              organisationId,
              role: role || undefined,
              startedOn: startedOn ?? undefined,
              endedOn: endedOn ?? undefined,
            }),
          ),
          Effect.tap(() =>
            grant(
              events,
              contributor.id,
              rewardFor(contributor.id, 'added_membership', {
                relatedEntityType: 'organisation_membership',
                relatedEntityId: membershipId,
              }),
            ),
          ),
        ),
      ),
    ),
    Effect.flatMap(writtenMembership(membershipId)),
  )
}
