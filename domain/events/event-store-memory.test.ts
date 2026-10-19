import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { ConcurrencyError } from './event-store'
import { createInMemoryEventStore, inMemoryUnitOfWork } from './event-store-memory'

const stream = { streamType: 'test', streamId: 'a' }
const actor = { actorId: 'me' }

describe('in-memory event store', () => {
  it('numbers the revisions after the expected one and loads a stream in order', async () => {
    const store = createInMemoryEventStore()
    await Effect.runPromise(store.append(stream, 0, [{ type: 'Started', payload: {} }], actor))
    const stored = await Effect.runPromise(
      store.append(stream, 1, [{ type: 'Renamed', payload: { title: 'B' } }], actor),
    )

    expect(stored[0].revision).toBe(2)
    const loaded = await Effect.runPromise(store.load(stream))
    expect(loaded.map((e) => [e.revision, e.type])).toEqual([
      [1, 'Started'],
      [2, 'Renamed'],
    ])
  })

  it('refuses a stale revision', async () => {
    const store = createInMemoryEventStore()
    await Effect.runPromise(store.append(stream, 0, [{ type: 'Started', payload: {} }], actor))
    const result = await Effect.runPromise(
      Effect.either(store.append(stream, 0, [{ type: 'Late', payload: {} }], actor)),
    )
    expect(Either.isLeft(result) && result.left).toBeInstanceOf(ConcurrencyError)
  })

  it('keeps streams apart', async () => {
    const store = createInMemoryEventStore()
    await Effect.runPromise(store.append(stream, 0, [{ type: 'Started', payload: {} }], actor))
    const other = await Effect.runPromise(store.load({ streamType: 'test', streamId: 'b' }))
    expect(other).toEqual([])
  })
})

describe('in-memory unit of work', () => {
  it('forgets the events of a command that fails', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    const result = await Effect.runPromise(
      Effect.either(
        run((events) =>
          Effect.flatMap(events.append(stream, 0, [{ type: 'Started', payload: {} }], actor), () =>
            Effect.fail('business rule broken'),
          ),
        ),
      ),
    )
    expect(Either.isLeft(result)).toBe(true)
    expect(journal.all()).toEqual([])
  })

  it('keeps the events of a command that succeeds', async () => {
    const { run, journal } = inMemoryUnitOfWork()
    await Effect.runPromise(
      run((events) => events.append(stream, 0, [{ type: 'Started', payload: {} }], actor)),
    )
    expect(journal.all()).toHaveLength(1)
  })
})
