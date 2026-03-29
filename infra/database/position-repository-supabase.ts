import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Position, PositionId, PositionSlug, PositionTitle } from '../../domain/entities/position'
import { DatabaseError } from '../../domain/repositories/errors'
import { PositionRepository } from '../../domain/repositories/position-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

function mapRow(data: Record<string, unknown>): Position {
  return Position.make({
    id: PositionId.make(data.id as string),
    title: PositionTitle.make(data.title as string),
    slug: PositionSlug.make(data.slug as string),
    description: data.description as string,
    subjectId: data.subject_id as string,
    createdBy: (data.created_by as string) ?? undefined,
    createdAt: new Date(data.created_at as string),
    updatedAt: new Date(data.updated_at as string),
  })
}

export function createPositionRepository(supabase: SupabaseClient): PositionRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('positions')
            .select('*')
            .eq('id', id)
            .is('deleted_at', null)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return mapRow(data)
        },
        catch: (error) => dbError('Failed to fetch position', error),
      }),

    findBySubjectAndSlug: (subjectId: string, slug: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('positions')
            .select('*')
            .eq('subject_id', subjectId)
            .eq('slug', slug)
            .is('deleted_at', null)
            .maybeSingle()

          if (error) throw error
          if (!data) return null

          return mapRow(data)
        },
        catch: (error) => dbError('Failed to fetch position by slug', error),
      }),

    findBySubjectId: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('positions')
            .select('*')
            .eq('subject_id', subjectId)
            .is('deleted_at', null)
            .order('title')

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch positions', error),
      }),

    create: (position: Position) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('positions')
            .insert({
              id: position.id,
              title: position.title,
              slug: position.slug,
              description: position.description,
              subject_id: position.subjectId,
              created_by: position.createdBy ?? null,
            })
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create position', error),
      }),

    update: (position: Position) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('positions')
            .update({
              title: position.title,
              slug: position.slug,
              description: position.description,
            })
            .eq('id', position.id)
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update position', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.rpc('soft_delete_position', { p_id: id })
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete position', error),
      }),

    mergeInto: (sourceId: string, targetId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.rpc('merge_positions', {
            source_id: sourceId,
            target_id: targetId,
          })
          if (error) throw error
        },
        catch: (error) => dbError('Failed to merge positions', error),
      }),
  }
}
