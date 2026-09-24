import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { OrganisationType } from '../../domain/entities/organisation'
import { MembershipId, OrganisationMembership } from '../../domain/entities/organisation-membership'
import { DatabaseError } from '../../domain/repositories/errors'
import {
  MembershipWithFigure,
  MembershipWithOrganisation,
  OrganisationMembershipRepository,
} from '../../domain/repositories/organisation-membership-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface MembershipRow {
  id: string
  organisation_id: string
  public_figure_id: string
  role: string | null
  started_on: string | null
  ended_on: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface FigureJoin {
  id: string
  name: string
  slug: string
}

interface OrganisationJoin {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisation_type: OrganisationType
}

function mapRow(row: MembershipRow): OrganisationMembership {
  return OrganisationMembership.make({
    id: MembershipId.make(row.id),
    organisationId: row.organisation_id,
    publicFigureId: row.public_figure_id,
    role: Option.fromNullable(row.role),
    startedOn: Option.map(Option.fromNullable(row.started_on), (d) => new Date(d)),
    endedOn: Option.map(Option.fromNullable(row.ended_on), (d) => new Date(d)),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

/** ISO date (YYYY-MM-DD) for a DATE column, or null */
const toDateColumn = (date: Option.Option<Date>): string | null =>
  Option.match(date, { onNone: () => null, onSome: (d) => d.toISOString().slice(0, 10) })

export function createOrganisationMembershipRepository(
  supabase: SupabaseClient,
): OrganisationMembershipRepository {
  return {
    findById: (id) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('organisation_memberships')
            .select('*')
            .eq('id', id)
            .maybeSingle()
          if (error) throw error
          return data ? mapRow(data) : null
        },
        catch: (error) => dbError('Failed to fetch membership', error),
      }),

    findByOrganisationId: (organisationId) =>
      Effect.tryPromise({
        try: async () => {
          // Most recent affiliation first: by start date, then by creation
          const { data, error } = await supabase
            .from('organisation_memberships')
            .select('*, public_figures!inner(id, name, slug)')
            .eq('organisation_id', organisationId)
            .is('public_figures.deleted_at', null)
            .order('started_on', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
          if (error) throw error
          return data.map((row): MembershipWithFigure => {
            const figure = row.public_figures as unknown as FigureJoin
            return {
              membership: mapRow(row),
              figure: { id: figure.id, name: figure.name, slug: figure.slug },
            }
          })
        },
        catch: (error) => dbError('Failed to fetch organisation members', error),
      }),

    findByPublicFigureId: (publicFigureId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('organisation_memberships')
            .select('*, organisations!inner(id, name, slug, acronym, organisation_type)')
            .eq('public_figure_id', publicFigureId)
            .is('organisations.deleted_at', null)
            .order('started_on', { ascending: false, nullsFirst: false })
            .order('created_at', { ascending: false })
          if (error) throw error
          return data.map((row): MembershipWithOrganisation => {
            const organisation = row.organisations as unknown as OrganisationJoin
            return {
              membership: mapRow(row),
              organisation: {
                id: organisation.id,
                name: organisation.name,
                slug: organisation.slug,
                acronym: organisation.acronym,
                organisationType: organisation.organisation_type,
              },
            }
          })
        },
        catch: (error) => dbError('Failed to fetch public figure memberships', error),
      }),

    create: (membership) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('organisation_memberships')
            .insert({
              id: membership.id,
              organisation_id: membership.organisationId,
              public_figure_id: membership.publicFigureId,
              role: Option.getOrNull(membership.role),
              started_on: toDateColumn(membership.startedOn),
              ended_on: toDateColumn(membership.endedOn),
              created_by: membership.createdBy,
              updated_by: membership.updatedBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create membership', error),
      }),

    delete: (id) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('organisation_memberships').delete().eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete membership', error),
      }),
  }
}
