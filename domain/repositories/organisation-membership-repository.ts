import { Context, Effect } from 'effect'
import { OrganisationType } from '../entities/organisation'
import { OrganisationMembership } from '../entities/organisation-membership'
import { DatabaseError } from './errors'

/** The member side of a membership, as shown on an organisation page */
export interface MembershipFigure {
  id: string
  name: string
  slug: string
}

/** The organisation side of a membership, as shown on a public figure page */
export interface MembershipOrganisation {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisationType: OrganisationType
}

export interface MembershipWithFigure {
  membership: OrganisationMembership
  figure: MembershipFigure
}

export interface MembershipWithOrganisation {
  membership: OrganisationMembership
  organisation: MembershipOrganisation
}

export interface OrganisationMembershipRepository {
  findById(id: string): Effect.Effect<OrganisationMembership | null, DatabaseError>

  /** Memberships of an organisation with their public figure, most recent first */
  findByOrganisationId(organisationId: string): Effect.Effect<MembershipWithFigure[], DatabaseError>

  /** Memberships of a public figure with their organisation, most recent first */
  findByPublicFigureId(
    publicFigureId: string,
  ): Effect.Effect<MembershipWithOrganisation[], DatabaseError>

  create(membership: OrganisationMembership): Effect.Effect<OrganisationMembership, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>
}

export const OrganisationMembershipRepository =
  Context.GenericTag<OrganisationMembershipRepository>('OrganisationMembershipRepository')
