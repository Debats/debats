import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  OccupationFamily,
  OccupationFamilyId,
  OccupationFamilyName,
  OccupationFamilySlug,
} from '../../domain/entities/occupation-family'
import { DatabaseError } from '../../domain/repositories/errors'
import { OccupationFamilyRepository } from '../../domain/repositories/occupation-family-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface FamilyRow {
  id: string
  name: string
  slug: string
  description: string
  position: number
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

function mapRow(row: FamilyRow): OccupationFamily {
  return OccupationFamily.make({
    id: OccupationFamilyId.make(row.id),
    name: OccupationFamilyName.make(row.name),
    slug: OccupationFamilySlug.make(row.slug),
    description: row.description,
    position: row.position,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

export function createOccupationFamilyRepository(
  supabase: SupabaseClient,
): OccupationFamilyRepository {
  const all = () => supabase.from('occupation_families').select('*')

  const findOne = (apply: (q: ReturnType<typeof all>) => ReturnType<typeof all>, message: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await apply(all()).maybeSingle()
        if (error) throw error
        return data ? mapRow(data) : null
      },
      catch: (error) => dbError(message, error),
    })

  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await all().order('position').order('name')
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch occupation families', error),
      }),

    findBySlug: (slug) =>
      findOne((q) => q.eq('slug', slug), 'Failed to fetch occupation family by slug'),

    findById: (id) => findOne((q) => q.eq('id', id), 'Failed to fetch occupation family'),

    create: (family) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('occupation_families')
            .insert({
              id: family.id,
              name: family.name,
              slug: family.slug,
              description: family.description,
              position: family.position,
              created_by: family.createdBy,
              updated_by: family.updatedBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create occupation family', error),
      }),

    delete: (id) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('occupation_families').delete().eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete occupation family', error),
      }),
  }
}
