/** One page of rows, with the total number of rows matching the query. */
export type Page<Row> = { rows: Row[]; total: number | null }

export type FetchPage<Row> = (offset: number, limit: number) => Promise<Page<Row>>

/**
 * Reads every row of a query, page after page.
 *
 * PostgREST caps a response at `max_rows` (a server setting), so a single
 * request silently returns a truncated list. Paging is driven by how many rows
 * actually came back and by the exact count, never by an assumed page size:
 * a server that caps pages lower than requested is handled, and a page that
 * comes back empty while rows are still missing raises instead of looping.
 */
export async function fetchAllPages<Row>(
  fetchPage: FetchPage<Row>,
  pageSize: number,
): Promise<Row[]> {
  const rows: Row[] = []

  for (;;) {
    const page = await fetchPage(rows.length, pageSize)
    const { total } = page

    if (page.rows.length === 0) {
      if (total !== null && rows.length < total) {
        throw new Error(`Pagination stalled: read ${rows.length} of ${total} rows`)
      }
      return rows
    }

    rows.push(...page.rows)
    if (total !== null && rows.length >= total) return rows
  }
}

/** PostgREST caps a response at `max_rows`; ask for a full page and let paging adapt. */
export const DEFAULT_PAGE_SIZE = 1000

type QueryResult<Row> = { data: Row[] | null; error: unknown; count: number | null }

/**
 * Reads every row of a Supabase query that scans a whole table.
 *
 * `buildPage` must apply `.range(offset, offset + limit - 1)` and ask for an
 * exact count, so paging knows when to stop:
 *
 * ```ts
 * fetchAllRows((offset, limit) =>
 *   supabase.from('public_figures').select('*', { count: 'exact' })
 *     .is('deleted_at', null).order('name').range(offset, offset + limit - 1))
 * ```
 */
export function fetchAllRows<Row>(
  buildPage: (offset: number, limit: number) => PromiseLike<QueryResult<Row>>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<Row[]> {
  return fetchAllPages<Row>(async (offset, limit) => {
    const { data, error, count } = await buildPage(offset, limit)
    if (error) throw error
    return { rows: data ?? [], total: count }
  }, pageSize)
}
