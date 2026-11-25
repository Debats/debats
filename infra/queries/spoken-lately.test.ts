import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { subjectsByFigure, voicesBySubject } from '../../domain/read-models/spoken-lately'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadSpokenSince } from './spoken-lately'

/** Runs against the local database (`npm run test:db`), on the statements it holds */
const hasDatabase = Boolean(process.env.DATABASE_URL)

// Far enough back for the local database to hold statements, whenever it was copied
const SINCE = new Date('2026-01-01T12:00:00Z')

/** The live statements stated since that day, of live authors, on live subjects */
const counted = (groupedBy: 'subject' | 'figure') =>
  getPrismaClient().$queryRawUnsafe<{ id: string; count: bigint }[]>(`
  SELECT ${groupedBy === 'subject' ? 'p.subject_id' : 'f.id'} AS id,
         count(DISTINCT ${groupedBy === 'subject' ? 'COALESCE(f.id, o.id)' : 'p.subject_id'}) AS count
  FROM statements st
  JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
  JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
  LEFT JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
  LEFT JOIN organisations o ON o.id = st.organisation_id AND o.deleted_at IS NULL
  WHERE st.deleted_at IS NULL AND st.stated_at >= '2026-01-01'
    AND ${groupedBy === 'subject' ? 'COALESCE(f.id, o.id)' : 'f.id'} IS NOT NULL
  GROUP BY 1`)

const asMap = (rows: { id: string; count: bigint }[]) =>
  new Map(rows.map((row) => [row.id, Number(row.count)]))

describe.skipIf(!hasDatabase)('who spoke of late', () => {
  it('gives each subject the distinct live authors of the statements stated since a day', async () => {
    const spoken = await Effect.runPromise(loadSpokenSince(createAdminSupabaseClient(), SINCE))

    const voices = voicesBySubject(spoken)
    expect(voices.size).toBeGreaterThan(0)
    expect(voices).toEqual(asMap(await counted('subject')))
  }, 30_000)

  it('gives each public figure the distinct subjects she spoke on since a day', async () => {
    const spoken = await Effect.runPromise(loadSpokenSince(createAdminSupabaseClient(), SINCE))

    const subjects = subjectsByFigure(spoken)
    expect(subjects.size).toBeGreaterThan(0)
    expect(subjects).toEqual(asMap(await counted('figure')))
  }, 30_000)

  it('reads nobody since a day to come', async () => {
    const spoken = await Effect.runPromise(
      loadSpokenSince(createAdminSupabaseClient(), new Date('2199-01-01T12:00:00Z')),
    )

    expect(spoken).toEqual([])
  })
})
