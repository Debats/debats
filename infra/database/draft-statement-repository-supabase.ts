import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  DraftAuthor,
  DraftOrganisationData,
  DraftPublicFigureData,
  DraftStatement,
  DraftValidation,
  draftOrganisationAuthor,
  draftPublicFigureAuthor,
} from '../../domain/entities/draft-statement'
import { DatabaseError } from '../../domain/repositories/errors'
import {
  fromStatementContent,
  StatementContentColumns,
  toStatementContent,
} from './statement-content-columns'
import {
  DraftStatementRepository,
  NewDraftStatement,
} from '../../domain/repositories/draft-statement-repository'
import { DraftGrouping, draftGroupsOf } from '../../domain/read-models/drafts-view'
import { fetchAllRows } from './fetch-all-pages'

type GroupingColumn = 'subject_title' | 'public_figure_name' | 'organisation_name'

/** What a draft is grouped by: its subject, and the one author column it fills */
type GroupingRow = {
  subject_title: string
  public_figure_name: string | null
  organisation_name: string | null
}

/** The column the drafts carry each grouping in */
const GROUPING_COLUMNS: Record<DraftGrouping, GroupingColumn> = {
  subject: 'subject_title',
  public_figure: 'public_figure_name',
  organisation: 'organisation_name',
}

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

/** Exactly one of the two author columns is set, enforced by a check constraint. */
function mapAuthor(row: Record<string, unknown>): DraftAuthor {
  if (row.organisation_name) {
    return draftOrganisationAuthor(
      row.organisation_name as string,
      (row.organisation_data as DraftOrganisationData) ?? null,
    )
  }
  return draftPublicFigureAuthor(
    row.public_figure_name as string,
    (row.public_figure_data as DraftPublicFigureData) ?? null,
  )
}

/** Columns for the author side being written, clearing the other side. */
function authorColumns(author: DraftAuthor): Record<string, unknown> {
  return author.kind === 'organisation'
    ? {
        organisation_name: author.name,
        organisation_data: author.data,
        public_figure_name: null,
        public_figure_data: null,
      }
    : {
        public_figure_name: author.name,
        public_figure_data: author.data,
        organisation_name: null,
        organisation_data: null,
      }
}

function mapRow(row: Record<string, unknown>): DraftStatement {
  return {
    id: row.id as string,
    author: mapAuthor(row),
    content: toStatementContent(row as StatementContentColumns),
    sourceName: row.source_name as string,
    sourceUrl: row.source_url as string,
    date: row.date as string,
    aiNotes: (row.ai_notes as string) ?? null,
    subjectTitle: row.subject_title as string,
    positionTitle: row.position_title as string,
    subjectData: (row.subject_data as DraftStatement['subjectData']) ?? null,
    positionData: (row.position_data as DraftStatement['positionData']) ?? null,
    arguments: (row.arguments as DraftStatement['arguments']) ?? [],
    occupations: (row.occupations as DraftStatement['occupations']) ?? [],
    affiliations: (row.affiliations as DraftStatement['affiliations']) ?? [],
    origin: row.origin as string,
    chantierId: (row.chantier_id as string) ?? null,
    section: (row.section as string) ?? null,
    status: row.status as DraftStatement['status'],
    rejectionNote: (row.rejection_note as string) ?? null,
    validation: (row.validation as DraftValidation) ?? null,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

export function createDraftStatementRepository(supabase: SupabaseClient): DraftStatementRepository {
  return {
    createMany: (drafts: NewDraftStatement[]) =>
      Effect.tryPromise({
        try: async () => {
          const rows = drafts.map((draft) => ({
            ...authorColumns(draft.author),
            ...fromStatementContent(draft.content),
            subject_title: draft.subjectTitle,
            position_title: draft.positionTitle,
            source_name: draft.sourceName,
            source_url: draft.sourceUrl,
            date: draft.date,
            ai_notes: draft.aiNotes,
            subject_data: draft.subjectData,
            position_data: draft.positionData,
            arguments: draft.arguments,
            occupations: draft.occupations,
            affiliations: draft.affiliations,
            origin: draft.origin,
            chantier_id: draft.chantierId,
            section: draft.section,
          }))

          const { data, error } = await supabase.from('draft_statements').insert(rows).select('id')

          if (error) throw error
          return data.map((row) => row.id as string)
        },
        catch: (error) => dbError('Failed to create drafts', error),
      }),

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

    findPendingInGroup: (grouping: DraftGrouping, label: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .eq('status', 'pending')
            .eq(GROUPING_COLUMNS[grouping], label)
            .order('created_at', { ascending: false })

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError(`Failed to fetch pending drafts by ${grouping}`, error),
      }),

    countPendingGroups: (grouping: DraftGrouping) =>
      Effect.tryPromise({
        try: async () => {
          const column = GROUPING_COLUMNS[grouping]
          // A draft has exactly one author, so the column of the other kind is null
          const rows = await fetchAllRows<GroupingRow>((offset, limit) =>
            supabase
              .from('draft_statements')
              .select('subject_title, public_figure_name, organisation_name', { count: 'exact' })
              .eq('status', 'pending')
              .not(column, 'is', null)
              .order('id')
              .range(offset, offset + limit - 1),
          )
          return draftGroupsOf(rows.flatMap((row) => row[column] ?? []))
        },
        catch: (error) => dbError(`Failed to count pending drafts by ${grouping}`, error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .eq('id', id)
            .maybeSingle()

          if (error) throw error
          return data ? mapRow(data) : null
        },
        catch: (error) => dbError('Failed to fetch draft', error),
      }),

    findAdoptableBySubjects: (subjectTitles: string[]) =>
      Effect.tryPromise({
        try: async () => {
          if (subjectTitles.length === 0) return []
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .in('subject_title', subjectTitles)
            .is('chantier_id', null)
            .neq('status', 'validated')
            .order('created_at', { ascending: false })
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch adoptable drafts', error),
      }),

    findByIds: (ids: string[]) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return []
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .in('id', ids)
            .order('created_at', { ascending: false })
          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch drafts by id', error),
      }),

    assignChantier: (draftIds: string[], chantierId: string) =>
      Effect.tryPromise({
        try: async () => {
          if (draftIds.length === 0) return
          const { error } = await supabase
            .from('draft_statements')
            .update({ chantier_id: chantierId })
            .in('id', draftIds)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to assign drafts to chantier', error),
      }),

    findByChantier: (chantierId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('draft_statements')
            .select('*')
            .eq('chantier_id', chantierId)
            .order('created_at', { ascending: false })

          if (error) throw error
          return data.map(mapRow)
        },
        catch: (error) => dbError('Failed to fetch the drafts of a chantier', error),
      }),

    update: (
      id: string,
      fields: Partial<Omit<DraftStatement, 'id' | 'createdAt' | 'updatedAt' | 'status'>>,
    ) =>
      Effect.tryPromise({
        try: async () => {
          const row: Record<string, unknown> = {}
          // The content is one value: every variant column is rewritten together
          if (fields.content !== undefined) Object.assign(row, fromStatementContent(fields.content))
          if (fields.sourceName !== undefined) row.source_name = fields.sourceName
          if (fields.sourceUrl !== undefined) row.source_url = fields.sourceUrl
          if (fields.date !== undefined) row.date = fields.date
          if (fields.aiNotes !== undefined) row.ai_notes = fields.aiNotes
          if (fields.author !== undefined) Object.assign(row, authorColumns(fields.author))
          if (fields.subjectTitle !== undefined) row.subject_title = fields.subjectTitle
          if (fields.positionTitle !== undefined) row.position_title = fields.positionTitle
          if (fields.subjectData !== undefined) row.subject_data = fields.subjectData
          if (fields.positionData !== undefined) row.position_data = fields.positionData
          if (fields.arguments !== undefined) row.arguments = fields.arguments
          if (fields.occupations !== undefined) row.occupations = fields.occupations
          if (fields.affiliations !== undefined) row.affiliations = fields.affiliations
          if (fields.rejectionNote !== undefined) row.rejection_note = fields.rejectionNote
          if (fields.origin !== undefined) row.origin = fields.origin
          if (fields.section !== undefined) row.section = fields.section

          const { data, error } = await supabase
            .from('draft_statements')
            .update({ ...row, status: 'pending' })
            .eq('id', id)
            .select()
            .maybeSingle()

          if (error) throw error
          return data ? mapRow(data) : null
        },
        catch: (error) => dbError('Failed to update draft', error),
      }),

    validated: (id: string, validation: DraftValidation) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('draft_statements')
            .update({ status: 'validated', rejection_note: null, validation })
            .eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to mark draft validated', error),
      }),

    updateStatus: (id: string, status: 'rejected' | 'revision_requested', rejectionNote?: string) =>
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

    deleteById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('draft_statements').delete().eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete draft', error),
      }),
  }
}
