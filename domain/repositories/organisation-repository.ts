import { Context, Effect } from 'effect'
import { Organisation } from '../entities/organisation'
import { OrganisationSummary } from '../read-models/organisation-summary'
import { DatabaseError } from './errors'

export interface OrganisationRepository {
  findAll(): Effect.Effect<Organisation[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Organisation | null, DatabaseError>

  findById(id: string): Effect.Effect<Organisation | null, DatabaseError>

  /** Organisations whose name or acronym contains the query */
  searchByName(query: string, limit?: number): Effect.Effect<Organisation[], DatabaseError>

  create(organisation: Organisation): Effect.Effect<Organisation, DatabaseError>

  update(organisation: Organisation): Effect.Effect<Organisation, DatabaseError>

  delete(id: string): Effect.Effect<void, DatabaseError>

  /** Every organisation with its members count, ordered by name */
  findSummaries(): Effect.Effect<OrganisationSummary[], DatabaseError>
}

export const OrganisationRepository =
  Context.GenericTag<OrganisationRepository>('OrganisationRepository')
