import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Occupation,
  OccupationId,
  OccupationName,
  OccupationSlug,
} from '../../domain/entities/occupation'
import { OccupationFamilyId } from '../../domain/entities/occupation-family'
import { DatabaseError } from '../../domain/repositories/errors'
import { OccupationRepository } from '../../domain/repositories/occupation-repository'
import { sortOccupationsHeld } from '../../domain/read-models/occupations'
import { OccupationAssignment } from '../../domain/services/occupation-distribution'
import { fetchAllRows } from './fetch-all-pages'
import { fetchInChunks } from './in-chunks'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface OccupationRow {
  id: string
  name: string
  slug: string
  family_id: string
  description: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

interface AssignmentRow {
  public_figure_id: string
  occupation_id: string
}

const mapAssignment = (row: AssignmentRow): OccupationAssignment => ({
  publicFigureId: row.public_figure_id,
  occupationId: row.occupation_id,
})

function mapRow(row: OccupationRow): Occupation {
  return Occupation.make({
    id: OccupationId.make(row.id),
    name: OccupationName.make(row.name),
    slug: OccupationSlug.make(row.slug),
    familyId: OccupationFamilyId.make(row.family_id),
    description: row.description,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

export function createOccupationRepository(supabase: SupabaseClient): OccupationRepository {
  const all = () => supabase.from('occupations').select('*')

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
          const { data, error } = await all().order('name')
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch occupations', error),
      }),

    findBySlug: (slug) => findOne((q) => q.eq('slug', slug), 'Failed to fetch occupation by slug'),

    findById: (id) => findOne((q) => q.eq('id', id), 'Failed to fetch occupation'),

    findByIds: (ids) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return []
          const { data, error } = await all().in('id', ids).order('name')
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch occupations by ids', error),
      }),

    create: (occupation) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('occupations')
            .insert({
              id: occupation.id,
              name: occupation.name,
              slug: occupation.slug,
              family_id: occupation.familyId,
              description: occupation.description,
              created_by: occupation.createdBy,
              updated_by: occupation.updatedBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create occupation', error),
      }),

    update: (occupation) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('occupations')
            .update({
              name: occupation.name,
              slug: occupation.slug,
              family_id: occupation.familyId,
              description: occupation.description,
              updated_by: occupation.updatedBy,
              updated_at: new Date().toISOString(),
            })
            .eq('id', occupation.id)
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update occupation', error),
      }),

    delete: (id) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('occupations').delete().eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete occupation', error),
      }),

    findByPublicFigureId: (publicFigureId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figure_occupations')
            .select('is_current, occupations!inner (*)')
            .eq('public_figure_id', publicFigureId)
          if (error) throw error
          const rows = data as unknown as Array<{ is_current: boolean; occupations: OccupationRow }>
          return sortOccupationsHeld(
            rows.map((row) => ({ occupation: mapRow(row.occupations), current: row.is_current })),
          )
        },
        catch: (error) => dbError('Failed to fetch public figure occupations', error),
      }),

    findCurrentHeldByPublicFigureIds: (publicFigureIds) =>
      Effect.tryPromise({
        try: async () => {
          const rows = await fetchInChunks(publicFigureIds, async (chunk) => {
            const { data, error } = await supabase
              .from('public_figure_occupations')
              .select('public_figure_id, occupations!inner (*)')
              .in('public_figure_id', chunk)
              .eq('is_current', true)
            if (error) throw error
            return data as unknown as Array<{
              public_figure_id: string
              occupations: OccupationRow
            }>
          })
          return rows.map((row) => ({
            publicFigureId: row.public_figure_id,
            occupation: mapRow(row.occupations),
          }))
        },
        catch: (error) => dbError('Failed to fetch current occupations by figures', error),
      }),

    findPublicFigureIdsByOccupationId: (occupationId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('public_figure_occupations')
            .select('public_figure_id')
            .eq('occupation_id', occupationId)
          if (error) throw error
          return data.map((row) => row.public_figure_id)
        },
        catch: (error) => dbError('Failed to fetch public figures by occupation', error),
      }),

    findAllAssignments: () =>
      Effect.tryPromise({
        try: async () => {
          const rows = await fetchAllRows<AssignmentRow>((offset, limit) =>
            supabase
              .from('public_figure_occupations')
              .select('public_figure_id, occupation_id', { count: 'exact' })
              .order('public_figure_id')
              .order('occupation_id')
              .range(offset, offset + limit - 1),
          )
          return rows.map(mapAssignment)
        },
        catch: (error) => dbError('Failed to fetch occupation assignments', error),
      }),

    findAssignmentsByPublicFigureIds: (publicFigureIds) =>
      Effect.tryPromise({
        try: async () => {
          const rows = await fetchInChunks(publicFigureIds, async (chunk) => {
            const { data, error } = await supabase
              .from('public_figure_occupations')
              .select('public_figure_id, occupation_id')
              .in('public_figure_id', chunk)
            if (error) throw error
            return data as AssignmentRow[]
          })
          return rows.map(mapAssignment)
        },
        catch: (error) => dbError('Failed to fetch occupation assignments by figures', error),
      }),
  }
}
