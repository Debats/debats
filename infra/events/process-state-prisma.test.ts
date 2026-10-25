import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import { DatabaseError } from '../../domain/repositories/errors'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/** Runs against the local database (`npm run test:db`), on a contributor the seed provides. */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const prisma = () => getPrismaClient()

const email = `invitee-${crypto.randomUUID().slice(0, 8)}@example.test`
let contributorId = ''

describe.skipIf(!hasDatabase)('process state on Postgres', () => {
  beforeAll(async () => {
    contributorId = (await prisma().contributors.findFirstOrThrow({ select: { id: true } })).id
    await prisma().invitations.create({
      data: { inviter_id: contributorId, invitee_email: email, invitee_name: 'Test' },
    })
  })

  afterAll(async () => {
    await prisma().invitations.deleteMany({ where: { invitee_email: email } })
    await prisma().$disconnect()
  })

  it('leaves the invitation pending when the command fails', async () => {
    const outcome = await Effect.runPromise(
      Effect.either(
        runUnitOfWork((_events, process) =>
          Effect.andThen(
            process.acceptInvitation(email, contributorId),
            Effect.fail(new DatabaseError('down')),
          ),
        ),
      ),
    )

    expect(Either.isLeft(outcome)).toBe(true)
    const row = await prisma().invitations.findFirstOrThrow({ where: { invitee_email: email } })
    expect(row).toMatchObject({ status: 'pending', invitee_id: null })
  })

  it('accepts the pending invitation of the address for the contributor who joined', async () => {
    await Effect.runPromise(
      runUnitOfWork((_events, process) => process.acceptInvitation(email, contributorId)),
    )

    const row = await prisma().invitations.findFirstOrThrow({ where: { invitee_email: email } })
    expect(row).toMatchObject({ status: 'accepted', invitee_id: contributorId })
  })
})
