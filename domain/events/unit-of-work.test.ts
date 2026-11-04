import { describe, expect, it } from 'vitest'
import { Effect, Layer, pipe, TestClock, TestContext } from 'effect'
import { inMemoryUnitOfWork } from './event-store-memory'
import { EventStore } from './event-store'
import { RunUnitOfWork, runUnitOfWork, UnitOfWork } from './unit-of-work'

const subject = { streamType: 'subject', streamId: 'subject-1' }
const contributor = { streamType: 'contributor', streamId: 'contributor-1' }
const added = { type: 'SubjectAdded', payload: { name: 'Le SMIC' } }
const granted = { type: 'ReputationGranted', payload: { amount: 50 } }
const alice = { actorId: 'alice' }

/** The command, run on a clock stopped on the instant it is taken on */
const takenOn = <A, E>(
  instant: Date,
  run: RunUnitOfWork,
  work: (events: EventStore, happenedAt: Date) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    Effect.provide(
      Effect.andThen(TestClock.setTime(instant), runUnitOfWork(work)),
      Layer.merge(TestContext.TestContext, Layer.succeed(UnitOfWork, run)),
    ),
  )

describe('runUnitOfWork', () => {
  it('dates every fact of the command with the instant it was taken on, however it is written', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    const commandedAt = new Date('2026-04-02T08:15:00Z')

    await takenOn(commandedAt, run, (events) =>
      pipe(
        events.append(subject, 0, [added], alice),
        Effect.andThen(events.appendToEnd(contributor, [granted], alice)),
      ),
    )

    expect(journal.all().map((event) => event.occurredAt)).toEqual([commandedAt, commandedAt])
  })

  it('keeps the date a writer gives: a backfill says when its facts happened', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    const longAgo = new Date('2015-06-01T00:00:00Z')

    await takenOn(new Date('2026-04-02T08:15:00Z'), run, (events) =>
      events.append(subject, 0, [added], { ...alice, occurredAt: longAgo }),
    )

    expect(journal.all().map((event) => event.occurredAt)).toEqual([longAgo])
  })

  it('hands the instant to the command, for a decision that judges on time', async () => {
    const { run } = inMemoryUnitOfWork()
    const commandedAt = new Date('2026-04-02T08:15:00Z')

    const judgedOn = await takenOn(commandedAt, run, (_events, happenedAt) =>
      Effect.succeed(happenedAt),
    )

    expect(judgedOn).toEqual(commandedAt)
  })
})
