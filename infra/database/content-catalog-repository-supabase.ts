import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ContentCatalogRepository } from '../../domain/repositories/content-catalog-repository'
import { DatabaseError } from '../../domain/repositories/errors'
import { buildContentCatalog } from '../../domain/read-models/content-catalog'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

/** PostgREST caps a response at 1000 rows, so pages are read until exhaustion. */
const PAGE_SIZE = 1000

async function fetchLiveRows<Row>(
  supabase: SupabaseClient,
  table: string,
  columns: string,
): Promise<Row[]> {
  const rows: Row[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .is('deleted_at', null)
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)

    if (error) throw error
    rows.push(...(data as Row[]))
    if (data.length < PAGE_SIZE) return rows
  }
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
