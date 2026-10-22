import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { createInMemoryEventStore } from '../events/event-store-memory'
import { AggregateStream, decideOn, IMPORT, loadOrImport } from './aggregate-stream'
import { Rejected } from './types'

/** A counter: the smallest aggregate that can be opened, moved and closed */
interface Counter {
  count: number
  closed: boolean
}

type CounterEvent =
  | { type: 'Opened'; payload: { count: number } }
  | { type: 'Moved'; payload: { by: number } }
  | { type: 'Closed'; payload: Record<string, never> }

/** What a table would hold of a counter */
interface CounterRow {
  count: number
  openedAt: Date
}

const counterAggregate: AggregateStream<Counter, CounterEvent, CounterRow> = {
  streamType: 'counter',
  notFound: 'Le compteur est introuvable.',
  replay: (events) =>
    Either.right(
      events.reduce<Counter | null>((state, stored) => {
        switch (stored.type) {
          case 'Opened':
            return { count: (stored.payload as { count: number }).count, closed: false }
          case 'Moved':
            return state && { ...state, count: state.count + (stored.payload as { by: number }).by }
          case 'Closed':
            return state && { ...state, closed: true }
          default:
            return state
        }
      }, null),
    ),
  isLive: (state) => !state.closed,
  importBatches: (row) => [
    {
      events: [opened(row.count)],
      options: { actorId: null, metadata: IMPORT, occurredAt: row.openedAt },
    },
  ],
}

const id = 'counter-1'
const stream = { streamType: 'counter', streamId: id }
const nothing = () => Effect.succeed(null)
const rowOf = (row: CounterRow) => () => Effect.succeed(row)

function opened(count: number): CounterEvent {
  return { type: 'Opened', payload: { count } }
}
const moved = (by: number): CounterEvent => ({ type: 'Moved', payload: { by } })
const closed: CounterEvent = { type: 'Closed', payload: {} }

const openedAt = new Date('2024-01-10T10:00:00Z')

describe('loadOrImport', () => {
  it('loads the stream when it has events, without asking the tables', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), moved(2)], { actorId: 'alice' }))
    let asked = 0
    const source = () => Effect.sync(() => void asked++).pipe(Effect.as(null))

    const history = await Effect.runPromise(loadOrImport(counterAggregate, events, id, source))

    expect(history.map((e) => e.type)).toEqual(['Opened', 'Moved'])
    expect(asked).toBe(0)
  })

  it('imports the aggregate from the tables when its stream is empty, dated and marked', async () => {
    const events = createInMemoryEventStore()

    const history = await Effect.runPromise(
      loadOrImport(counterAggregate, events, id, rowOf({ count: 7, openedAt })),
    )

    expect(history).toMatchObject([
      { streamId: id, revision: 1, type: 'Opened', payload: { count: 7 }, metadata: IMPORT },
    ])
    expect(history[0].occurredAt).toEqual(openedAt)
    expect(events.all()).toHaveLength(1)
  })

  it('refuses when neither the journal nor the tables know the aggregate', async () => {
    const events = createInMemoryEventStore()

    const outcome = await Effect.runPromise(
      Effect.either(loadOrImport(counterAggregate, events, id, nothing)),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new Rejected('Le compteur est introuvable.'),
    )
    expect(events.all()).toEqual([])
  })
})

describe('decideOn', () => {
  it('appends the decision after the history and rebuilds the state', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const state = await Effect.runPromise(
      decideOn(counterAggregate, events, id, nothing, 'bob', (current) =>
        Effect.succeed([moved(current.count + 10)]),
      ),
    )

    expect(state).toEqual({ count: 12, closed: false })
    expect(events.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'Opened', 'alice'],
      [2, 'Moved', 'bob'],
    ])
  })

  it('writes nothing when the decision changes nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const state = await Effect.runPromise(
      decideOn(counterAggregate, events, id, nothing, 'bob', () => Effect.succeed([])),
    )

    expect(state).toEqual({ count: 1, closed: false })
    expect(events.all()).toHaveLength(1)
  })

  it('refuses a deleted aggregate as unknown, before any decision', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), closed], { actorId: 'alice' }))
    let decided = 0

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, nothing, 'bob', () =>
          Effect.sync(() => void decided++).pipe(Effect.as([moved(1)])),
        ),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new Rejected('Le compteur est introuvable.'),
    )
    expect(decided).toBe(0)
    expect(events.all()).toHaveLength(2)
  })

  it('lets the decision refuse, writing nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, nothing, 'bob', () =>
          Effect.fail(new Rejected('Trop haut.', 'count')),
        ),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(new Rejected('Trop haut.', 'count'))
    expect(events.all()).toHaveLength(1)
  })
})
