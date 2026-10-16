/**
 * PostgREST turns `.in('id', ids)` into a query string: a few hundred UUIDs
 * exceed the server's URI limit and the request fails with "URI too long".
 * Queries over a list of ids go through here in slices small enough to pass.
 */
export const IN_CHUNK_SIZE = 100

export async function fetchInChunks<Row>(
  ids: readonly string[],
  fetchChunk: (chunk: string[]) => Promise<Row[]>,
  chunkSize = IN_CHUNK_SIZE,
): Promise<Row[]> {
  const rows: Row[] = []
  for (let start = 0; start < ids.length; start += chunkSize) {
    rows.push(...(await fetchChunk(ids.slice(start, start + chunkSize))))
  }
  return rows
}
