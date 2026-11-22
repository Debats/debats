import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '../../types/database.types'
import {
  JointDeclaration,
  JointDeclarationId,
  JointDeclarationSlug,
  JointDeclarationTitle,
} from '../../domain/entities/joint-declaration'
import { organisationAuthor, publicFigureAuthor } from '../../domain/entities/statement'
import { DatabaseError } from '../../domain/repositories/errors'
import { JointDeclarationRepository } from '../../domain/repositories/joint-declaration-repository'
import { sameSource, sourceKey } from '../../domain/value-objects/source-address'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export type JointDeclarationRow = Database['public']['Tables']['joint_declarations']['Row']

export function mapJointDeclarationRow(row: JointDeclarationRow): JointDeclaration {
  return JointDeclaration.make({
    id: JointDeclarationId.make(row.id),
    title: JointDeclarationTitle.make(row.title),
    slug: JointDeclarationSlug.make(row.slug),
    ...(row.presentation ? { presentation: row.presentation } : {}),
    sourceName: row.source_name,
    sourceUrl: row.source_url,
    declaredAt: new Date(row.declared_at),
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  })
}

/** How many texts the picker of the statement form offers at most */
const SEARCH_LIMIT = 8

/** A title typed by a contributor, with the characters `ilike` reads as wildcards taken literally */
const literally = (query: string) => query.replace(/[\\%_]/g, (wildcard) => `\\${wildcard}`)

export function createJointDeclarationRepository(
  supabase: SupabaseClient<Database>,
): JointDeclarationRepository {
  /** The ids of the joint declarations whose positions match, each once */
  const idsWhere = (column: 'position_id' | 'subject_id', value: string) =>
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await supabase
          .from('joint_declaration_positions')
          .select('joint_declaration_id')
          .eq(column, value)

        if (error) throw error
        return Array.from(new Set(data.map((row) => row.joint_declaration_id)))
      },
      catch: (error) => dbError(`Failed to fetch joint declarations by ${column}`, error),
    })

  return {
    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('joint_declarations')
            .select('*')
            .order('declared_at', { ascending: false })

          if (error) throw error
          return data.map(mapJointDeclarationRow)
        },
        catch: (error) => dbError('Failed to fetch joint declarations', error),
      }),

    findBySlug: (slug) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('joint_declarations')
            .select('*')
            .eq('slug', slug)
            .maybeSingle()

          if (error) throw error
          return data ? mapJointDeclarationRow(data) : null
        },
        catch: (error) => dbError('Failed to fetch joint declaration by slug', error),
      }),

    /*
     * The same page is typed in more than one way (scheme, « www. », trailing
     * slash): the database narrows to the links that hold the address, the
     * domain says which one is the same page.
     */
    findBySourceUrl: (sourceUrl) =>
      Effect.tryPromise({
        try: async () => {
          const key = sourceKey(sourceUrl)
          if (!key) return null
          const { data, error } = await supabase
            .from('joint_declarations')
            .select('*')
            .ilike('source_url', `%${literally(key)}%`)
            .order('declared_at', { ascending: false })

          if (error) throw error
          const same = data.find((row) => sameSource(row.source_url, sourceUrl))
          return same ? mapJointDeclarationRow(same) : null
        },
        catch: (error) => dbError('Failed to fetch joint declaration by source', error),
      }),

    findHeld: (declarationId) =>
      Effect.tryPromise({
        try: async () => {
          const [positions, signatories] = await Promise.all([
            supabase
              .from('joint_declaration_positions')
              .select('subject_id, position_id, quote, rank')
              .eq('joint_declaration_id', declarationId)
              .order('rank'),
            supabase
              .from('joint_declaration_signatories')
              .select('public_figure_id, organisation_id, rank')
              .eq('joint_declaration_id', declarationId)
              .order('rank'),
          ])
          if (positions.error) throw positions.error
          if (signatories.error) throw signatories.error

          return {
            positions: positions.data.map((row) => ({
              subjectId: row.subject_id,
              positionId: row.position_id,
              quote: row.quote,
            })),
            signatories: signatories.data.flatMap((row) =>
              row.organisation_id
                ? [organisationAuthor(row.organisation_id)]
                : row.public_figure_id
                  ? [publicFigureAuthor(row.public_figure_id)]
                  : [],
            ),
          }
        },
        catch: (error) => dbError('Failed to fetch what a joint declaration holds', error),
      }),

    findIdsByPositionId: (positionId) => idsWhere('position_id', positionId),
    findIdsBySubjectId: (subjectId) => idsWhere('subject_id', subjectId),

    searchByTitle: (query) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('joint_declarations')
            .select('*')
            .ilike('title', `%${literally(query)}%`)
            .order('declared_at', { ascending: false })
            .limit(SEARCH_LIMIT)

          if (error) throw error
          return data.map(mapJointDeclarationRow)
        },
        catch: (error) => dbError('Failed to search joint declarations', error),
      }),
  }
}
