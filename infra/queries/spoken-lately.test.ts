import { describe, it, expect } from 'vitest'
import { Effect } from 'effect'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadVoicesSince } from './spoken-lately'

/** Runs against the local database (`npm run test:db`), on the statements it holds */
const hasDatabase = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDatabase)('the voices of late', () => {
  it('counts, on each subject, the distinct live authors of the statements stated since a day', async () => {
    // Far enough back for the local database to hold statements, whenever it was copied
    const since = new Date('2026-01-01T12:00:00Z')
    const expected = await getPrismaClient().$queryRaw<{ subject_id: string; voices: bigint }[]>`
      SELECT p.subject_id, count(DISTINCT COALESCE(f.id, o.id)) AS voices
      FROM statements st
      JOIN positions p ON p.id = st.position_id AND p.deleted_at IS NULL
      JOIN subjects s ON s.id = p.subject_id AND s.deleted_at IS NULL
      LEFT JOIN public_figures f ON f.id = st.public_figure_id AND f.deleted_at IS NULL
      LEFT JOIN organisations o ON o.id = st.organisation_id AND o.deleted_at IS NULL
      WHERE st.deleted_at IS NULL AND st.stated_at >= '2026-01-01'
        AND COALESCE(f.id, o.id) IS NOT NULL
      GROUP BY p.subject_id`

    const voices = await Effect.runPromise(loadVoicesSince(createAdminSupabaseClient(), since))

    expect(voices.size).toBeGreaterThan(0)
    expect(new Map(voices)).toEqual(
      new Map(expected.map((row) => [row.subject_id, Number(row.voices)])),
    )
  }, 30_000)

  it('counts nobody since a day to come', async () => {
    const voices = await Effect.runPromise(
      loadVoicesSince(createAdminSupabaseClient(), new Date('2199-01-01T12:00:00Z')),
    )

    expect(voices.size).toBe(0)
  })
})
