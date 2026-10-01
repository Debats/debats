import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ContentCatalogRepository } from '../../domain/repositories/content-catalog-repository'
import { DatabaseError } from '../../domain/repositories/errors'
import { buildContentCatalog } from '../../domain/read-models/content-catalog'
import { fetchAllPages } from './fetch-all-pages'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

const PAGE_SIZE = 1000

/** Every row of a table that has not been soft-deleted, however many pages it takes. */
function fetchLiveRows<Row>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<Row[]> {
  return fetchAllPages<Row>(async (offset, limit) => {
    const { data, error, count } = await supabase
      .from(table)
      .select(columns, { count: 'exact' })
      .is('deleted_at', null)
      .range(offset, offset + limit - 1)

    if (error) throw error
    return { rows: data as Row[], total: count }
  }, PAGE_SIZE)
}

export function createContentCatalogRepository(
  supabase: SupabaseClient,
): ContentCatalogRepository {
  return {
    getCatalog: () =>
      Effect.tryPromise({
        try: async () => {
          const [subjects, positions, publicFigures, organisations] = await Promise.all([
            fetchLiveRows<{ id: string; slug: string; title: string }>(
              supabase,
              'subjects',
              'id,slug,title',
            ),
            fetchLiveRows<{ id: string; subject_id: string; slug: string; title: string }>(
              supabase,
              'positions',
              'id,subject_id,slug,title',
            ),
            fetchLiveRows<{ id: string; slug: string; name: string }>(
              supabase,
              'public_figures',
              'id,slug,name',
            ),
            fetchLiveRows<{ id: string; slug: string; name: string; acronym: string | null }>(
              supabase,
              'organisations',
              'id,slug,name,acronym',
            ),
          ])

          return buildContentCatalog({
            subjects,
            positions: positions.map((p) => ({
              id: p.id,
              subjectId: p.subject_id,
              slug: p.slug,
              title: p.title,
            })),
            publicFigures,
            organisations,
          })
        },
        catch: (error) => dbError('Failed to fetch the content catalog', error),
      }),
  }
}
