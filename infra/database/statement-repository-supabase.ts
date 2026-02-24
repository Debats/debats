import * as Sentry from '@sentry/nextjs'
import { Effect, Option } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import {
  Statement,
  StatementId,
  Evidence,
  EvidenceId,
  LatestStatement,
} from '../../domain/entities/statement'
import { Position, PositionId, PositionTitle } from '../../domain/entities/position'
import { Subject, SubjectId, SubjectTitle, SubjectSlug } from '../../domain/entities/subject'
import {
  PublicFigure,
  PublicFigureId,
  PublicFigureName,
  PublicFigureSlug,
} from '../../domain/entities/public-figure'
import {
  DatabaseError,
  StatementRepository,
  StatementWithDetails,
  StatementWithFigure,
} from '../../domain/repositories/statement-repository'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export function createStatementRepository(supabase: SupabaseClient): StatementRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('id', id)
            .single()

          if (error) {
            if (error.code === 'PGRST116') return null
            throw error
          }

          return Statement.make({
            id: StatementId.make(data.id),
            publicFigureId: data.public_figure_id,
            positionId: data.position_id,
            takenAt: data.taken_at ? new Date(data.taken_at) : undefined,
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        },
        catch: (error) => dbError('Failed to fetch statement', error),
      }),

    findByPublicFigureId: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('public_figure_id', publicFigureId)

          if (error) throw error

          return data.map((row) =>
            Statement.make({
              id: StatementId.make(row.id),
              publicFigureId: row.public_figure_id,
              positionId: row.position_id,
              takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
              createdBy: row.created_by ?? undefined,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            }),
          )
        },
        catch: (error) => dbError('Failed to fetch statements', error),
      }),

    findByPositionId: (positionId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select('*')
            .eq('position_id', positionId)

          if (error) throw error

          return data.map((row) =>
            Statement.make({
              id: StatementId.make(row.id),
              publicFigureId: row.public_figure_id,
              positionId: row.position_id,
              takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
              createdBy: row.created_by ?? undefined,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            }),
          )
        },
        catch: (error) => dbError('Failed to fetch statements', error),
      }),

    findByPublicFigureWithDetails: (publicFigureId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id,
            public_figure_id,
            position_id,
            taken_at,
            created_by,
            created_at,
            updated_at,
            positions (
              id,
              title,
              description,
              subject_id,
              created_by,
              created_at,
              updated_at,
              subjects (
                id,
                title,
                slug,
                presentation,
                problem,
                picture_url,
                created_by,
                created_at,
                updated_at
              )
            )
          `,
            )
            .eq('public_figure_id', publicFigureId)

          if (error) throw error

          return data
            .filter((row) => row.positions && (row.positions as any).subjects)
            .map((row) => {
              const pos = row.positions as any
              const subj = pos.subjects as any

              return {
                statement: Statement.make({
                  id: StatementId.make(row.id),
                  publicFigureId: row.public_figure_id,
                  positionId: row.position_id,
                  takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
                  createdBy: row.created_by ?? undefined,
                  createdAt: new Date(row.created_at),
                  updatedAt: new Date(row.updated_at),
                }),
                position: Position.make({
                  id: PositionId.make(pos.id),
                  title: PositionTitle.make(pos.title),
                  description: pos.description,
                  subjectId: pos.subject_id,
                  createdBy: pos.created_by ?? undefined,
                  createdAt: new Date(pos.created_at),
                  updatedAt: new Date(pos.updated_at),
                }),
                subject: Subject.make({
                  id: SubjectId.make(subj.id),
                  title: SubjectTitle.make(subj.title),
                  slug: SubjectSlug.make(subj.slug),
                  presentation: subj.presentation,
                  problem: subj.problem,
                  pictureUrl: subj.picture_url ?? undefined,
                  createdBy: subj.created_by ?? undefined,
                  createdAt: new Date(subj.created_at),
                  updatedAt: new Date(subj.updated_at),
                }),
              } as StatementWithDetails
            })
        },
        catch: (error) => dbError('Failed to fetch statements with details', error),
      }),

    findBySubjectWithFigures: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id,
            public_figure_id,
            position_id,
            taken_at,
            created_by,
            created_at,
            updated_at,
            positions!inner (
              id,
              title,
              description,
              subject_id,
              created_by,
              created_at,
              updated_at
            ),
            public_figures (
              id,
              name,
              slug,
              presentation,
              wikipedia_url,
              website_url,
              created_by,
              created_at,
              updated_at
            )
          `,
            )
            .eq('positions.subject_id', subjectId)

          if (error) throw error

          return data
            .filter((row) => row.positions && row.public_figures)
            .map((row) => {
              const pos = row.positions as any
              const fig = row.public_figures as any

              return {
                statement: Statement.make({
                  id: StatementId.make(row.id),
                  publicFigureId: row.public_figure_id,
                  positionId: row.position_id,
                  takenAt: row.taken_at ? new Date(row.taken_at) : undefined,
                  createdBy: row.created_by ?? undefined,
                  createdAt: new Date(row.created_at),
                  updatedAt: new Date(row.updated_at),
                }),
                position: Position.make({
                  id: PositionId.make(pos.id),
                  title: PositionTitle.make(pos.title),
                  description: pos.description,
                  subjectId: pos.subject_id,
                  createdBy: pos.created_by ?? undefined,
                  createdAt: new Date(pos.created_at),
                  updatedAt: new Date(pos.updated_at),
                }),
                publicFigure: PublicFigure.make({
                  id: PublicFigureId.make(fig.id),
                  name: PublicFigureName.make(fig.name),
                  slug: PublicFigureSlug.make(fig.slug),
                  presentation: fig.presentation,
                  wikipediaUrl: fig.wikipedia_url,
                  websiteUrl: fig.website_url ? Option.some(fig.website_url) : Option.none(),
                  createdBy: fig.created_by,
                  createdAt: new Date(fig.created_at),
                  updatedAt: new Date(fig.updated_at),
                }),
              } as StatementWithFigure
            })
        },
        catch: (error) => dbError('Failed to fetch statements with figures', error),
      }),

    findLatest: (limit: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .select(
              `
            id,
            created_at,
            positions (
              title,
              subjects (
                title,
                slug
              )
            ),
            public_figures (
              name,
              slug
            )
          `,
            )
            .order('created_at', { ascending: false })
            .limit(limit)

          if (error) throw error

          return data
            .filter((row) => row.positions && row.public_figures)
            .map((row) => {
              const pos = row.positions as any
              const subj = pos.subjects as any
              const fig = row.public_figures as any

              return {
                statementId: row.id,
                publicFigureName: fig.name,
                publicFigureSlug: fig.slug,
                positionTitle: pos.title,
                subjectTitle: subj.title,
                subjectSlug: subj.slug,
                createdAt: new Date(row.created_at),
              } as LatestStatement
            })
        },
        catch: (error) => dbError('Failed to fetch latest statements', error),
      }),

    create: (statement: Statement) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('statements')
            .insert({
              id: statement.id,
              public_figure_id: statement.publicFigureId,
              position_id: statement.positionId,
              created_by: statement.createdBy,
            })
            .select()
            .single()

          if (error) throw error

          return Statement.make({
            id: StatementId.make(data.id),
            publicFigureId: data.public_figure_id,
            positionId: data.position_id,
            takenAt: data.taken_at ? new Date(data.taken_at) : undefined,
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        },
        catch: (error) => dbError('Failed to create statement', error),
      }),

    createEvidence: (evidence: Evidence) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('evidences')
            .insert({
              id: evidence.id,
              statement_id: evidence.statementId,
              source_name: evidence.sourceName,
              source_url: evidence.sourceUrl,
              quote: evidence.quote,
              fact_date: evidence.factDate.toISOString().split('T')[0],
              created_by: evidence.createdBy,
            })
            .select()
            .single()

          if (error) throw error

          return Evidence.make({
            id: EvidenceId.make(data.id),
            statementId: data.statement_id,
            sourceName: data.source_name,
            sourceUrl: data.source_url ?? undefined,
            quote: data.quote,
            factDate: new Date(data.fact_date),
            createdBy: data.created_by ?? undefined,
            createdAt: new Date(data.created_at),
            updatedAt: new Date(data.updated_at),
          })
        },
        catch: (error) => dbError('Failed to create evidence', error),
      }),

    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('statements').delete().eq('id', id)

          if (error) throw error
        },
        catch: (error) => dbError('Failed to delete statement', error),
      }),

    getEvidences: (statementId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('evidences')
            .select('*')
            .eq('statement_id', statementId)

          if (error) throw error

          return data.map((row) =>
            Evidence.make({
              id: EvidenceId.make(row.id),
              statementId: row.statement_id,
              sourceName: row.source_name,
              sourceUrl: row.source_url ?? undefined,
              quote: row.quote,
              factDate: new Date(row.fact_date),
              createdBy: row.created_by ?? undefined,
              createdAt: new Date(row.created_at),
              updatedAt: new Date(row.updated_at),
            }),
          )
        },
        catch: (error) => dbError('Failed to fetch evidences', error),
      }),
  }
}
