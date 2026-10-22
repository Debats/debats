import { describe, it, expect, afterAll } from 'vitest'
import { Effect, Either } from 'effect'
import { ConcurrencyError, StoredEvent, streamRevision } from '../../domain/events/event-store'
import { DatabaseError } from '../../domain/repositories/errors'
import { getPrismaClient } from '../prisma/client'
import { runUnitOfWork } from './unit-of-work'

/**
 * Runs against the local database: `npm run test:db`. Skipped when no
 * DATABASE_URL is set, so the plain unit test run stays database-free.
 */
const hasDatabase = Boolean(process.env.DATABASE_URL)
const stream = { streamType: 'test', streamId: crypto.randomUUID() }
/** The test stream has no table to keep in step */
const NO_PROJECTION = { test: [] }

describe.skipIf(!hasDatabase)('event store on Postgres', () => {
  afterAll(async () => {
    await getPrismaClient().domain_events.deleteMany({ where: { stream_type: 'test' } })
    await getPrismaClient().$disconnect()
  })

  it('appends events at the revisions after the expected one and loads them in order', async () => {
    const stored = await Effect.runPromise(
      runUnitOfWork(
        (events) =>
          events.append(
            stream,
            0,
            [
              { type: 'Started', payload: { title: 'A' } },
              { type: 'Renamed', payload: { title: 'B' } },
            ],
            { actorId: null, metadata: { source: 'test' } },
          ),
        NO_PROJECTION,
      ),
    )
    expect(stored.map((e) => e.revision)).toEqual([1, 2])

    const loaded = await Effect.runPromise(runUnitOfWork((events) => events.load(stream)))
    expect(loaded.map((e) => [e.type, e.payload])).toEqual([
      ['Started', { title: 'A' }],
      ['Renamed', { title: 'B' }],
    ])
    expect(loaded[0].metadata).toEqual({ source: 'test' })
    expect(streamRevision(loaded)).toBe(2)
  })

  it('refuses to append after a stale revision', async () => {
    const result = await Effect.runPromise(
      Effect.either(
        runUnitOfWork(
          (events) => events.append(stream, 1, [{ type: 'Late', payload: {} }], { actorId: null }),
          NO_PROJECTION,
        ),
      ),
    )

    expect(Either.isLeft(result) && result.left).toBeInstanceOf(ConcurrencyError)
  })

  it('rolls the events back when the command fails', async () => {
    const failing = { streamType: 'test', streamId: crypto.randomUUID() }
    const result = await Effect.runPromise(
      Effect.either(
        runUnitOfWork(
          (events) =>
            Effect.flatMap(
              events.append(failing, 0, [{ type: 'Started', payload: {} }], { actorId: null }),
              () => Effect.fail(new Error('business rule broken')),
            ),
          NO_PROJECTION,
        ),
      ),
    )
    expect(Either.isLeft(result)).toBe(true)

    const loaded = await Effect.runPromise(runUnitOfWork((events) => events.load(failing)))
    expect(loaded).toEqual([])
  })

  it('hands each appended event to the projectors of its stream type', async () => {
    const projected: StoredEvent[] = []
    const registry = {
      test: [(event: StoredEvent) => Effect.sync(() => void projected.push(event))],
    }
    const own = { streamType: 'test', streamId: crypto.randomUUID() }

    await Effect.runPromise(
      runUnitOfWork(
        (events) =>
          events.append(
            own,
            0,
            [
              { type: 'Started', payload: {} },
              { type: 'Renamed', payload: {} },
            ],
            { actorId: null },
          ),
        registry,
      ),
    )

    expect(projected.map((e) => [e.streamId, e.revision, e.type])).toEqual([
      [own.streamId, 1, 'Started'],
      [own.streamId, 2, 'Renamed'],
    ])
  })

  it('rolls the events back when a projector fails', async () => {
    const registry = { test: [() => Effect.fail(new DatabaseError('projection broken'))] }
    const own = { streamType: 'test', streamId: crypto.randomUUID() }

    const result = await Effect.runPromise(
      Effect.either(
        runUnitOfWork(
          (events) => events.append(own, 0, [{ type: 'Started', payload: {} }], { actorId: null }),
          registry,
        ),
      ),
    )
    expect(Either.isLeft(result) && result.left).toBeInstanceOf(DatabaseError)

    const loaded = await Effect.runPromise(runUnitOfWork((events) => events.load(own)))
    expect(loaded).toEqual([])
  })
})
