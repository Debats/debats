import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Argument, ArgumentId, ArgumentTitle } from '../../domain/entities/argument'
import { DatabaseError } from '../../domain/repositories/errors'
import { ArgumentRepository } from '../../domain/repositories/argument-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

interface ArgumentRow {
  id: string
  subject_id: string
  title: string
  description: string
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

function mapRow(row: ArgumentRow): Argument {
  return Argument.make({
    id: ArgumentId.make(row.id),
    subjectId: row.subject_id,
    title: ArgumentTitle.make(row.title),
    description: row.description,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

export function createArgumentRepository(supabase: SupabaseClient): ArgumentRepository {
  const live = () => supabase.from('arguments').select('*').is('deleted_at', null)

  return {
    findBySubjectId: (subjectId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await live().eq('subject_id', subjectId).order('created_at')
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch subject arguments', error),
      }),

    findByIds: (ids) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return []
          const { data, error } = await live().in('id', ids)
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch arguments by ids', error),
      }),

    findIdsByStatementId: (statementId) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('argument_statements')
            .select('argument_id')
            .eq('statement_id', statementId)
          if (error) throw error
          return data.map((row) => row.argument_id as string)
        },
        catch: (error) => dbError('Failed to fetch statement arguments', error),
      }),

    create: (argument) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('arguments')
            .insert({
              id: argument.id,
              subject_id: argument.subjectId,
              title: argument.title,
              description: argument.description,
              created_by: argument.createdBy,
              updated_by: argument.updatedBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to create argument', error),
      }),

    setStatementArguments: (statementId, argumentIds, createdBy) =>
      Effect.tryPromise({
        try: async () => {
          const { error: deleteError } = await supabase
            .from('argument_statements')
            .delete()
            .eq('statement_id', statementId)
          if (deleteError) throw deleteError

          if (argumentIds.length === 0) return

          const { error: insertError } = await supabase.from('argument_statements').insert(
            argumentIds.map((argumentId) => ({
              statement_id: statementId,
              argument_id: argumentId,
              created_by: createdBy,
            })),
          )
          if (insertError) throw insertError
        },
        catch: (error) => dbError('Failed to set statement arguments', error),
      }),
  }
}
