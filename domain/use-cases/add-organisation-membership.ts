import { Effect, Either, pipe } from 'effect'
import { MembershipId, OrganisationMembership } from '../entities/organisation-membership'
import { addMembership, findMembership, hasCurrentMembership } from '../aggregates/public-figure'
import { RunUnitOfWork } from '../events/unit-of-work'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { runFormCommand } from './run-command'
import {
  decideOnPublicFigure,
  publicFigureAggregate,
  PublicFigureSource,
} from './public-figure-stream'

export type AddOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  organisationId: string
  publicFigureId: string
  role: string
  /** ISO date (YYYY-MM-DD) or empty */
  startedOn: string
  /** ISO date (YYYY-MM-DD) or empty */
  endedOn: string
  runUnitOfWork: RunUnitOfWork
  publicFigureSource: PublicFigureSource
  /** Read side: the organisation must exist */
  organisationRepo: OrganisationRepository
}

export type { FieldErrors }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

const ALREADY_MEMBER = 'Cette personnalité est déjà membre de cette organisation.'

/** Parses an optional ISO date field; `undefined` when empty, `null` when malformed. */
function parseOptionalDate(value: string): Date | undefined | null {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!ISO_DATE.test(trimmed)) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * Affiliates a public figure to an organisation, with an optional role and
 * period. The affiliation lives in the figure's stream; a current one to the
 * same organisation is refused.
 */
export async function addOrganisationMembershipUseCase(
  params: AddOrganisationMembershipParams,
): Promise<Either.Either<OrganisationMembership, string | FieldErrors>> {
  const { contributor, organisationId, publicFigureId, runUnitOfWork, publicFigureSource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_membership')) {
    const rank = requiredRank('add_membership')
    return Either.left(`Vous devez être ${rank} pour affilier une personnalité.`)
  }

  const organisation = await Effect.runPromise(params.organisationRepo.findById(organisationId))
  if (!organisation) {
    return Either.left('Cette organisation est introuvable.')
  }

  const fieldErrors: FieldErrors = {}

  const parts = publicFigureId ? await Effect.runPromise(publicFigureSource(publicFigureId)) : null
  if (!parts) {
    fieldErrors.publicFigureId = 'Choisissez une personnalité.'
  }

  if (params.role.trim().length > 100) {
    fieldErrors.role = 'Le rôle ne doit pas dépasser 100 caractères.'
  }

  const startedOn = parseOptionalDate(params.startedOn)
  if (startedOn === null) fieldErrors.startedOn = 'La date de début est invalide.'

  const endedOn = parseOptionalDate(params.endedOn)
  if (endedOn === null) {
    fieldErrors.endedOn = 'La date de fin est invalide.'
  } else if (startedOn && endedOn && endedOn < startedOn) {
    fieldErrors.endedOn = 'La date de fin doit être postérieure à la date de début.'
  }

  if (Object.keys(fieldErrors).length > 0) {
    return Either.left(fieldErrors)
  }

  const membershipId = MembershipId.make(crypto.randomUUID())
  const outcome = await runFormCommand(
    pipe(
      ensureStream(publicFigureAggregate, runUnitOfWork, publicFigureId, publicFigureSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            decideOnPublicFigure(events, publicFigureId, contributor.id, (state) =>
              hasCurrentMembership(state, organisationId)
                ? Effect.fail(new Rejected(ALREADY_MEMBER, 'publicFigureId'))
                : Effect.succeed([
                    addMembership({
                      membershipId,
                      organisationId,
                      role: params.role.trim() || undefined,
                      startedOn: startedOn ?? undefined,
                      endedOn: endedOn ?? undefined,
                    }),
                  ]),
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
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  const created = findMembership(outcome.right.state, membershipId)
  if (!created) throw new Error('The membership just added is missing from the figure')

  return Either.right(created)
}
