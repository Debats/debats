import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Organisation,
  OrganisationId,
  OrganisationName,
  OrganisationSlug,
  OrganisationType,
} from '../../domain/entities/organisation'
import { OrganisationSummary } from '../../domain/read-models/organisation-summary'
import { DatabaseError } from '../../domain/repositories/errors'
import { OrganisationRepository } from '../../domain/repositories/organisation-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface OrganisationRow {
  id: string
  name: string
  slug: string
  acronym: string | null
  organisation_type: OrganisationType
  presentation: string
  wikipedia_url: string | null
  website_url: string | null
  notoriety_sources: string[] | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

function mapRow(row: OrganisationRow): Organisation {
  return Organisation.make({
    id: OrganisationId.make(row.id),
    name: OrganisationName.make(row.name),
    slug: OrganisationSlug.make(row.slug),
    acronym: Option.fromNullable(row.acronym),
    organisationType: row.organisation_type,
    presentation: row.presentation,
    wikipediaUrl: Option.fromNullable(row.wikipedia_url),
    websiteUrl: Option.fromNullable(row.website_url),
    notorietySources: row.notoriety_sources ?? [],
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

function toRow(organisation: Organisation) {
  return {
    name: organisation.name,
    slug: organisation.slug,
    acronym: Option.getOrNull(organisation.acronym),
    organisation_type: organisation.organisationType,
    presentation: organisation.presentation,
    wikipedia_url: Option.getOrNull(organisation.wikipediaUrl),
    website_url: Option.getOrNull(organisation.websiteUrl),
    notoriety_sources: organisation.notorietySources,
    updated_by: organisation.updatedBy,
  }
}

export function createOrganisationRepository(supabase: SupabaseClient): OrganisationRepository {
  const live = () => supabase.from('organisations').select('*').is('deleted_at', null)

  const findOne = (column: 'id' | 'slug', value: string, message: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await live().eq(column, value).maybeSingle()
        if (error) throw error
        return data ? mapRow(data) : null
      },
      catch: (error) => dbError(message, error),
    })

  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await live().order('name')
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch organisations', error),
      }),

    findBySlug: (slug) => findOne('slug', slug, 'Failed to fetch organisation by slug'),

    findById: (id) => findOne('id', id, 'Failed to fetch organisation'),

    searchByName: (query, limit = 10) =>
      Effect.tryPromise({
        try: async () => {
          // The `or` filter is a PostgREST expression: strip its separators from user input
          const term = query.replace(/[,()]/g, '')
          const { data, error } = await live()
            .or(`name.ilike.%${term}%,acronym.ilike.%${term}%`)
            .order('name')
            .limit(limit)
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to search organisations', error),
      }),

    create: (organisation) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('organisations')
            .insert({
              id: organisation.id,
              ...toRow(organisation),
              created_by: organisation.createdBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create organisation', error),
      }),

    update: (organisation) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('organisations')
            .update(toRow(organisation))
            .eq('id', organisation.id)
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update organisation', error),
      }),

    delete: (id) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.rpc('soft_delete_organisation', { p_id: id })
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete organisation', error),
      }),

    findSummaries: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('v_organisation_summary')
            .select('*')
            .order('name')
          if (error) throw error
          return data.map(
            (row): OrganisationSummary => ({
              id: row.id,
              name: row.name,
              slug: row.slug,
              acronym: row.acronym,
              organisationType: row.organisation_type,
              presentation: row.presentation,
              membersCount: row.members_count ?? 0,
              statementsCount: row.statements_count ?? 0,
              subjectsCount: row.subjects_count ?? 0,
            }),
          )
        },
        catch: (error) => dbError('Failed to fetch organisation summaries', error),
      }),
  }
}
