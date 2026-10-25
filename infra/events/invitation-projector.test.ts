import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import {
  acceptInvitation,
  invitationStream,
  replayInvitation,
  revokeInvitation,
  sendInvitation,
} from '../../domain/aggregates/invitation'
import { decodeInvitationEvent, InvitationEvent } from '../../domain/aggregates/invitation-events'
import { ConcurrencyError } from '../../domain/events/event-store'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const invitationId = crypto.randomUUID()
const stream = invitationStream(invitationId)
const email = `invitee-${invitationId.slice(0, 8)}@example.test`
let contributorId = ''

const append = (revision: number, events: InvitationEvent[], actorId = contributorId) =>
  Effect.runPromise(
    runUnitOfWork((journal) => journal.append(stream, revision, events, { actorId })),
  )

describe.skipIf(!hasDatabase)('invitation projector', () => {
  beforeAll(async () => {
    contributorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
  })

  afterAll(async () => {
    await prisma().invitations.deleteMany({ where: { id: invitationId } })
    await prisma().domain_events.deleteMany({
      where: { stream_type: 'invitation', stream_id: invitationId },
    })
    await prisma().$disconnect()
  })

  it('writes the pending invitation, signed by the inviter', async () => {
    await append(0, [sendInvitation({ inviteeEmail: email, inviteeName: 'Test Invitee' })])

    const row = await prisma().invitations.findUniqueOrThrow({ where: { id: invitationId } })
    expect(row).toMatchObject({
      inviter_id: contributorId,
      invitee_email: email,
      invitee_name: 'Test Invitee',
      status: 'pending',
      invitee_id: null,
    })
  })

  it('accepts it once: a second acceptance at the same revision is a race, refused', async () => {
    const occurredAt = new Date('2024-03-04T05:06:07.000Z')
    await Effect.runPromise(
      runUnitOfWork((journal) =>
        journal.append(stream, 1, [acceptInvitation(contributorId)], {
          actorId: contributorId,
          occurredAt,
        }),
      ),
    )
    const again = await Effect.runPromise(
      Effect.either(
        runUnitOfWork((journal) =>
          journal.append(stream, 1, [acceptInvitation(contributorId)], { actorId: contributorId }),
        ),
      ),
    )

    expect(Either.isLeft(again) && again.left).toBeInstanceOf(ConcurrencyError)
    const row = await prisma().invitations.findUniqueOrThrow({ where: { id: invitationId } })
    expect(row).toMatchObject({
      status: 'accepted',
      invitee_id: contributorId,
      updated_at: occurredAt,
    })
  })

  it('rebuilds from the journal what the table holds', async () => {
    const history = await Effect.runPromise(runUnitOfWork((journal) => journal.load(stream)))
    const state = replayInvitation(history)
    expect(Either.isRight(state) && state.right?.invitation).toMatchObject({
      status: 'accepted',
      inviteeId: contributorId,
    })
  })

  it('removes a revoked invitation from the table', async () => {
    await append(2, [revokeInvitation()])

    expect(await prisma().invitations.findUnique({ where: { id: invitationId } })).toBeNull()
  })
})

describe.skipIf(!hasDatabase)('invitation journal after the backfill', () => {
  afterAll(() => prisma().$disconnect())

  it('holds a stream for every invitation in the table', async () => {
    const orphans = await prisma().$queryRaw<{ count: bigint }[]>`
      SELECT count(*)::bigint AS count FROM invitations i
      WHERE NOT EXISTS (
        SELECT 1 FROM domain_events e WHERE e.stream_type = 'invitation' AND e.stream_id = i.id
      )`
    expect(Number(orphans[0].count)).toBe(0)
  })

  it('replays every backfilled invitation to the status and invitee its row holds', async () => {
    const rows = await prisma().invitations.findMany()
    for (const row of rows) {
      const history = await Effect.runPromise(
        runUnitOfWork((journal) => journal.load(invitationStream(row.id))),
      )
      if (!history.some((e) => (e.metadata as { source?: string }).source === 'backfill')) continue
      expect(history.map((e) => decodeInvitationEvent(e)).filter(Either.isLeft)).toEqual([])
      const state = replayInvitation(history)
      if (Either.isLeft(state) || !state.right) throw new Error(`No state for ${row.id}`)
      expect(state.right.invitation).toMatchObject({
        inviterId: row.inviter_id,
        inviteeEmail: row.invitee_email,
        status: row.status,
        ...(row.invitee_id ? { inviteeId: row.invitee_id } : {}),
      })
    }
  })
})
