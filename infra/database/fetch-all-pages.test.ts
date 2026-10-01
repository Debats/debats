import { describe, expect, it, vi } from 'vitest'
import { fetchAllPages, fetchAllRows } from './fetch-all-pages'

/** Mimics a server that serves at most `serverLimit` rows per request. */
function fakeServer(total: number, serverLimit: number) {
  return vi.fn(async (offset: number, limit: number) => ({
    rows: Array.from(
      { length: Math.max(0, Math.min(limit, serverLimit, total - offset)) },
      (_, i) => offset + i,
    ),
    total,
  }))
}

describe('fetchAllPages', () => {
  it('returns every row when they all fit in one page', async () => {
    const fetchPage = fakeServer(3, 1000)
    expect(await fetchAllPages(fetchPage, 1000)).toEqual([0, 1, 2])
    expect(fetchPage).toHaveBeenCalledOnce()
  })

  it('returns every row across several pages', async () => {
    const fetchPage = fakeServer(2500, 1000)
    const rows = await fetchAllPages(fetchPage, 1000)
    expect(rows).toHaveLength(2500)
    expect(rows[2499]).toBe(2499)
  })

  it('returns every row even when the server caps pages below the requested size', async () => {
    // The real trap: asking for 1000 while the server only ever returns 100.
    const fetchPage = fakeServer(250, 100)
    const rows = await fetchAllPages(fetchPage, 1000)
    expect(rows).toHaveLength(250)
  })

  it('returns an empty list when there is nothing to read', async () => {
    expect(await fetchAllPages(fakeServer(0, 1000), 1000)).toEqual([])
  })

  it('stops instead of looping forever when a page comes back empty too early', async () => {
    const fetchPage = vi.fn(async () => ({ rows: [] as number[], total: 10 }))
    await expect(fetchAllPages(fetchPage, 1000)).rejects.toThrow(
      'Pagination stalled: read 0 of 10 rows',
    )
  })
})

describe('fetchAllRows', () => {
  /** Mimics a PostgREST response, capped at `serverLimit` rows per request. */
  function fakeQuery(total: number, serverLimit: number) {
    return vi.fn(async (offset: number, limit: number) => ({
      data: Array.from(
        { length: Math.max(0, Math.min(limit, serverLimit, total - offset)) },
        (_, i) => ({ id: offset + i }),
      ),
      error: null,
      count: total,
    }))
  }

  it('reads every row across the pages the server is willing to serve', async () => {
    const rows = await fetchAllRows(fakeQuery(1500, 500))
    expect(rows).toHaveLength(1500)
    expect(rows[1499]).toEqual({ id: 1499 })
  })

  it('throws the query error instead of returning a partial list', async () => {
    const failing = async () => ({ data: null, error: new Error('boom'), count: null })
    await expect(fetchAllRows(failing)).rejects.toThrow('boom')
  })

  it('treats a null payload as no rows', async () => {
    const empty = async () => ({ data: null, error: null, count: 0 })
    expect(await fetchAllRows(empty)).toEqual([])
  })
})
