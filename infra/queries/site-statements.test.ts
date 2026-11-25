import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { SiteStatement } from '../../domain/services/site-analyses'
import {
  addTestFigure,
  addTestStatement,
  addTestSubject,
  removeTestWrites,
} from '../events/journal-test-helpers'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadCurrentMembers, loadSiteStatements } from './site-statements'

/**
 * Runs against the local database (`npm run test:db`): a public figure of its
 * own, affiliated to two organisations of the seed — one affiliation ended —,
 * speaks on four subjects of its own: one live, one deleted since, one whose
 * position was deleted since, one where her statement was removed.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const tag = crypto.randomUUID().slice(0, 8)
const DAY = 24 * 60 * 60 * 1000
const STATED = new Date('2026-01-15')

describe.skipIf(!hasDatabase)('site statements', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let actorId: string
  let figureId: string
  let running: { id: string }
  let ended: { id: string }
  const subjectIds: string[] = []
  const today = new Date()

  /** A subject of the test with one position, on which the figure makes one statement */
  const spokenSubject = async (name: string) => {
    const written = await addTestSubject(actorId, `Sujet ${name} ${tag}`)
    subjectIds.push(written.subjectId)
    const statementId = await addTestStatement(actorId, {
      figureId,
      ...written,
      statedAt: STATED,
      sourceName: `Source ${tag}`,
      sourceUrl: `https://example.org/${name}-${tag}`,
    })
    return { ...written, statementId }
  }

  let live: Awaited<ReturnType<typeof spokenSubject>>
  let read: SiteStatement[]

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    actorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    ;[running, ended] = await prisma().organisations.findMany({
      where: { deleted_at: null },
      select: { id: true },
      take: 2,
    })
    figureId = await addTestFigure(actorId, `Personnalité De Test ${tag}`, [
      { organisationId: running.id },
      { organisationId: ended.id, endedOn: new Date(today.getTime() - 2 * DAY) },
    ])

    live = await spokenSubject('vivant')
    // What leaves the site after she spoke: the rows are marked as a deletion marks them
    const gone = { deleted_at: new Date() }
    const deletedSubject = await spokenSubject('supprime')
    await prisma().subjects.update({ where: { id: deletedSubject.subjectId }, data: gone })
    const deletedPosition = await spokenSubject('position supprimee')
    await prisma().positions.update({ where: { id: deletedPosition.positionId }, data: gone })
    const removed = await spokenSubject('retiree')
    await prisma().statements.update({ where: { id: removed.statementId }, data: gone })

    read = await Effect.runPromise(loadSiteStatements(supabase))
  }, 60_000)

  afterAll(async () => {
    // Her statements go with her
    await removeTestWrites({ subjectIds, figureIds: [figureId] })
    await prisma().$disconnect()
  })

  const hers = () => read.filter(({ author }) => author.id === figureId)

  it('reads a live statement with its author, its subject and how it was made', async () => {
    const subject = await prisma().subjects.findUniqueOrThrow({ where: { id: live.subjectId } })

    expect(hers()).toEqual([
      {
        author: expect.objectContaining({
          kind: 'public_figure',
          id: figureId,
          name: `Personnalité De Test ${tag}`,
        }),
        subject: { id: subject.id, title: `Sujet vivant ${tag}`, slug: subject.slug },
        positionId: live.positionId,
        type: 'declaration',
        signed: false,
        sourceName: `Source ${tag}`,
        statedAt: STATED,
        recordedAt: expect.any(Date),
      },
    ])
  })

  it('leaves out what was said on a deleted subject, for a deleted position, or was itself removed', () => {
    expect(hers().map(({ subject }) => subject.id)).toEqual([live.subjectId])
  })

  it('reads every live statement of the site, page after page', async () => {
    const live = await prisma().statements.count({
      where: {
        deleted_at: null,
        positions: { deleted_at: null, subjects: { deleted_at: null } },
        OR: [{ public_figures: { deleted_at: null } }, { organisations: { deleted_at: null } }],
      },
    })

    // Other tests add and remove statements meanwhile: the read and the count may differ by a few
    expect(Math.abs(read.length - live)).toBeLessThan(20)
  })

  it('lists as current members those whose affiliation has not ended', async () => {
    const members = await Effect.runPromise(loadCurrentMembers(supabase, today))

    expect(members.get(running.id)?.has(figureId)).toBe(true)
    expect(members.get(ended.id)?.has(figureId) ?? false).toBe(false)
  })
})
