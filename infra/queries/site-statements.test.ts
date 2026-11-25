import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect } from 'effect'
import { SiteStatement } from '../../domain/services/site-analyses'
import { getPrismaClient } from '../prisma/client'
import { createAdminSupabaseClient } from '../supabase/admin'
import { loadCurrentMembers, loadSiteStatements } from './site-statements'

/**
 * Runs against the local database (`npm run test:db`): three subjects of its
 * own — one live, one deleted, one whose position was deleted — on which a
 * public figure of the seed speaks, and two affiliations of hers, one ended.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const tag = crypto.randomUUID().slice(0, 8)
const DAY = 24 * 60 * 60 * 1000

describe.skipIf(!hasDatabase)('site statements', () => {
  let supabase: ReturnType<typeof createAdminSupabaseClient>
  let figure: { id: string; name: string; slug: string }
  let actor: { id: string }
  const subjectIds: string[] = []
  const membershipIds: string[] = []

  /** A subject of the test with one position, on which the figure makes one statement */
  const spokenSubject = async (
    name: string,
    deleted: { subject?: boolean; position?: boolean; statement?: boolean } = {},
  ) => {
    const at = (gone?: boolean) => (gone ? new Date() : null)
    const subject = await prisma().subjects.create({
      data: {
        title: `Sujet ${name} ${tag}`,
        slug: `sujet-${name}-${tag}`,
        presentation: 'Un sujet de test.',
        problem: 'Une question de test ?',
        created_by: actor.id,
        deleted_at: at(deleted.subject),
      },
    })
    subjectIds.push(subject.id)
    const position = await prisma().positions.create({
      data: {
        title: `Position ${name}`,
        slug: `position-${name}-${tag}`,
        description: 'Une position de test.',
        subject_id: subject.id,
        created_by: actor.id,
        deleted_at: at(deleted.position),
      },
    })
    await prisma().statements.create({
      data: {
        position_id: position.id,
        public_figure_id: figure.id,
        source_name: `Source ${tag}`,
        source_url: `https://example.org/${name}-${tag}`,
        quote: 'Les mots qui énoncent la position.',
        stated_at: new Date('2026-01-15'),
        created_by: actor.id,
        deleted_at: at(deleted.statement),
      },
    })
    return { subject, position }
  }

  let live: Awaited<ReturnType<typeof spokenSubject>>
  let read: SiteStatement[]

  beforeAll(async () => {
    supabase = createAdminSupabaseClient()
    actor = await prisma().contributors.findFirstOrThrow({ select: { id: true } })
    figure = await prisma().public_figures.findFirstOrThrow({
      where: { deleted_at: null },
      select: { id: true, name: true, slug: true },
    })
    live = await spokenSubject('vivant')
    await spokenSubject('supprime', { subject: true })
    await spokenSubject('position-supprimee', { position: true })
    await spokenSubject('retiree', { statement: true })
    read = await Effect.runPromise(loadSiteStatements(supabase))
  }, 60_000)

  afterAll(async () => {
    // Positions and statements go with their subject
    await prisma().subjects.deleteMany({ where: { id: { in: subjectIds } } })
    await prisma().organisation_memberships.deleteMany({ where: { id: { in: membershipIds } } })
    await prisma().$disconnect()
  })

  const onTestSubjects = () => read.filter(({ subject }) => subject.slug.endsWith(tag))

  it('reads a live statement with its author, its subject and how it was made', () => {
    expect(onTestSubjects()).toEqual([
      {
        author: expect.objectContaining({
          kind: 'public_figure',
          id: figure.id,
          name: figure.name,
        }),
        subject: { id: live.subject.id, title: live.subject.title, slug: live.subject.slug },
        positionId: live.position.id,
        type: 'declaration',
        signed: false,
        sourceName: `Source ${tag}`,
        statedAt: new Date('2026-01-15'),
        recordedAt: expect.any(Date),
      },
    ])
  })

  it('leaves out what was said on a deleted subject, for a deleted position, or was itself removed', () => {
    expect(onTestSubjects().map(({ subject }) => subject.slug)).toEqual([live.subject.slug])
  })

  it('reads every live statement of the site, past the first page', async () => {
    const { count } = await supabase
      .from('statements')
      .select(
        'id, positions!inner(deleted_at, subjects!inner(deleted_at)), public_figures(deleted_at), organisations(deleted_at)',
        { count: 'exact', head: true },
      )
      .is('deleted_at', null)
      .is('positions.deleted_at', null)
      .is('positions.subjects.deleted_at', null)

    // Statements whose author was deleted are the only ones the count holds and the read drops
    expect(read.length).toBeGreaterThan(0)
    expect(read.length).toBeLessThanOrEqual(count ?? -1)
  })

  it('lists as current members those whose affiliation has not ended', async () => {
    const today = new Date()
    const unaffiliated = await prisma().organisations.findMany({
      where: {
        deleted_at: null,
        organisation_memberships: { none: { public_figure_id: figure.id } },
      },
      select: { id: true },
      take: 2,
    })
    const [running, ended] = unaffiliated
    if (!running || !ended)
      throw new Error('The local database lacks two organisations to affiliate')
    const affiliate = async (organisationId: string, endedOn: Date | null) => {
      const membership = await prisma().organisation_memberships.create({
        data: {
          organisation_id: organisationId,
          public_figure_id: figure.id,
          ended_on: endedOn,
          created_by: actor.id,
          updated_by: actor.id,
        },
      })
      membershipIds.push(membership.id)
    }
    await affiliate(running.id, null)
    await affiliate(ended.id, new Date(today.getTime() - 2 * DAY))

    const members = await Effect.runPromise(loadCurrentMembers(supabase, today))

    expect(members.get(running.id)?.has(figure.id)).toBe(true)
    expect(members.get(ended.id)?.has(figure.id) ?? false).toBe(false)
  })
})
