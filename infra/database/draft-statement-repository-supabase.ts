import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DraftStatement } from '../../domain/entities/draft-statement'
import { DatabaseError } from '../../domain/repositories/errors'
import { DraftStatementRepository } from '../../domain/repositories/draft-statement-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

function mapRow(row: Record<string, unknown>): DraftStatement {
  return {
    id: row.id as string,
    quote: row.quote as string,
    sourceName: row.source_name as string,
    sourceUrl: row.source_url as string,
    date: row.date as string,
    aiNotes: (row.ai_notes as string) ?? null,
    publicFigureName: row.public_figure_name as string,
    subjectTitle: row.subject_title as string,
    positionTitle: row.position_title as string,
    publicFigureData: (row.public_figure_data as DraftStatement['publicFigureData']) ?? null,
    subjectData: (row.subject_data as DraftStatement['subjectData']) ?? null,
    positionData: (row.position_data as DraftStatement['positionData']) ?? null,
    origin: row.origin as string,
    status: row.status as DraftStatement['status'],
    rejectionNote: (row.rejection_note as string) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export function createDraftStatementRepository(supabase: SupabaseClient): DraftStatementRepository {
  return {
    findByStatus: (status: DraftStatement['status']) =>
      Effect.tryPromise({
        try: async () => {
          const orderColumn = status === 'pending' ? 'created_at' : 'updated_at'
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .eq('status', status)
            .order(orderColumn, { ascending: false })

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError(`Failed to fetch ${status} drafts`, error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .eq('id', id)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to fetch draft', error),
      }),

    update: (
      id: string,
      fields: Partial<Omit<DraftStatement, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
    ) =>
      Effect.tryPromise({
        try: async () => {
          const row: Record<string, unknown> = {}
          if (fields.quote !== undefined) row.quote = fields.quote
          if (fields.sourceName !== undefined) row.source_name = fields.sourceName
          if (fields.sourceUrl !== undefined) row.source_url = fields.sourceUrl
          if (fields.date !== undefined) row.date = fields.date
          if (fields.aiNotes !== undefined) row.ai_notes = fields.aiNotes
          if (fields.publicFigureName !== undefined)
            row.public_figure_name = fields.publicFigureName
          if (fields.subjectTitle !== undefined) row.subject_title = fields.subjectTitle
          if (fields.positionTitle !== undefined) row.position_title = fields.positionTitle
          if (fields.publicFigureData !== undefined)
            row.public_figure_data = fields.publicFigureData
          if (fields.subjectData !== undefined) row.subject_data = fields.subjectData
          if (fields.positionData !== undefined) row.position_data = fields.positionData
          if (fields.rejectionNote !== undefined) row.rejection_note = fields.rejectionNote
          if (fields.origin !== undefined) row.origin = fields.origin

          const { data, error } = await supabase
            .from('draft_statements')
            .update({ ...row, status: 'pending' })
            .eq('id', id)
            .select()
            .single()

          if (error) throw error
          return mapRow(data)
        },
        catch: (error) => dbError('Failed to update draft', error),
      }),

    updateStatus: (
      id: string,
      status: 'validated' | 'rejected' | 'revision_requested',
      rejectionNote?: string,
    ) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('draft_statements')
            .update({
              status,
              rejection_note: rejectionNote ?? null,
            })
            .eq('id', id)

          if (error) throw error
        },
        catch: (error) => dbError('Failed to update draft status', error),
      }),
  }
}
