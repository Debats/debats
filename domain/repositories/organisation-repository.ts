import { Context, Effect } from 'effect'
import { Organisation, OrganisationType } from '../entities/organisation'
import { OrganisationSummary } from '../read-models/organisation-summary'
import { DatabaseError } from './errors'

/** Read side of the organisations: writes go through the event journal */
export interface OrganisationRepository {
  findAll(): Effect.Effect<Organisation[], DatabaseError>

  findBySlug(slug: string): Effect.Effect<Organisation | null, DatabaseError>

  findById(id: string): Effect.Effect<Organisation | null, DatabaseError>

  /** Organisations whose name or acronym contains the query */
  searchByName(query: string, limit?: number): Effect.Effect<Organisation[], DatabaseError>

  /** Every organisation with its members count, ordered by name */
  findSummaries(): Effect.Effect<OrganisationSummary[], DatabaseError>

  /** The organisations of one type with their counters, ordered by name */
  findSummariesByType(type: OrganisationType): Effect.Effect<OrganisationSummary[], DatabaseError>

  /** The counters of one organisation, without reading the whole list */
  findSummaryById(id: string): Effect.Effect<OrganisationSummary | null, DatabaseError>
}

export const OrganisationRepository =
  Context.GenericTag<OrganisationRepository>('OrganisationRepository')
