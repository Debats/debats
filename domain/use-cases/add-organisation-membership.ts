import { Effect, Either } from 'effect'
import {
  createMembership,
  isCurrentMembership,
  OrganisationMembership,
} from '../entities/organisation-membership'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { OrganisationMembershipRepository } from '../repositories/organisation-membership-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

export type AddOrganisationMembershipParams = {
  contributor: ContributorIdentity | null
  organisationId: string
  publicFigureId: string
  role: string
  /** ISO date (YYYY-MM-DD) or empty */
  startedOn: string
  /** ISO date (YYYY-MM-DD) or empty */
  endedOn: string
  organisationRepo: OrganisationRepository
  publicFigureRepo: PublicFigureRepository
  membershipRepo: OrganisationMembershipRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

/** Parses an optional ISO date field; `undefined` when empty, `null` when malformed. */
function parseOptionalDate(value: string): Date | undefined | null {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  if (!ISO_DATE.test(trimmed)) return null
  const date = new Date(trimmed)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Affiliates a public figure to an organisation, with an optional role and period. */
export async function addOrganisationMembershipUseCase(
  params: AddOrganisationMembershipParams,
): Promise<Either.Either<OrganisationMembership, string | FieldErrors>> {
  const { contributor, organisationId, publicFigureId } = params

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

  const figure = publicFigureId
    ? await Effect.runPromise(params.publicFigureRepo.findById(publicFigureId))
    : null
  if (!figure) {
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

  const memberships = await Effect.runPromise(
    params.membershipRepo.findByOrganisationId(organisationId),
  )
  const alreadyMember = memberships.some(
    ({ membership }) =>
      membership.publicFigureId === publicFigureId && isCurrentMembership(membership),
  )
  if (alreadyMember) {
    return Either.left({
      publicFigureId: 'Cette personnalité est déjà membre de cette organisation.',
    })
  }

  const membership = createMembership({
    organisationId,
    publicFigureId,
    role: params.role,
    startedOn: startedOn ?? undefined,
    endedOn: endedOn ?? undefined,
    createdBy: contributor.id,
  })

  const created = await Effect.runPromise(params.membershipRepo.create(membership))

  await Effect.runPromise(
    params.reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_membership',
      amount: reputationReward('added_membership'),
      relatedEntityType: 'organisation_membership',
      relatedEntityId: created.id,
    }),
  )

  return Either.right(created)
}
