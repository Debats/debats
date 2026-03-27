import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Position, PositionId, PositionTitle } from '../../domain/entities/position'
import { DatabaseError } from '../../domain/repositories/errors'
import { PositionRepository } from '../../domain/repositories/position-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
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

          return Position.make({
            id: PositionId.make(data.id),
            title: PositionTitle.make(data.title),
            description: data.description,
            subjectId: data.subject_id,
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        },
        catch: (error) => dbError('Failed to fetch position', error),
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

          return data.map((row) =>
            Position.make({
              id: PositionId.make(row.id),
              title: PositionTitle.make(row.title),
              description: row.description,
              subjectId: row.subject_id,
              createdBy: row.created_by ?? undefined,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            }),
          )
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
              description: position.description,
              subject_id: position.subjectId,
              created_by: position.createdBy ?? null,
            })
            .select()
            .single()

          if (error) throw error

          return Position.make({
            id: PositionId.make(data.id),
            title: PositionTitle.make(data.title),
            description: data.description,
            subjectId: data.subject_id,
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
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
              description: position.description,
            })
            .eq('id', position.id)
            .select()
            .single()

          if (error) throw error

          return Position.make({
            id: PositionId.make(data.id),
            title: PositionTitle.make(data.title),
            description: data.description,
            subjectId: data.subject_id,
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
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
