import { describe, it, expect } from 'vitest'
import { Effect, Either } from 'effect'
import { ConcurrencyError } from '../events/event-store'
import { createInMemoryEventStore } from '../events/event-store-memory'
import { AggregateStream, decideOn, loadStream } from './aggregate-stream'
import { NotFound, Rejected } from './types'

/** A counter: the smallest aggregate that can be opened, moved and closed */
interface Counter {
  count: number
  closed: boolean
}

type CounterEvent =
  | { type: 'Opened'; payload: { count: number } }
  | { type: 'Moved'; payload: { by: number } }
  | { type: 'Closed'; payload: Record<string, never> }

const counterAggregate: AggregateStream<Counter, CounterEvent> = {
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
}

const id = 'counter-1'
const stream = { streamType: 'counter', streamId: id }

const opened = (count: number): CounterEvent => ({ type: 'Opened', payload: { count } })
const moved = (by: number): CounterEvent => ({ type: 'Moved', payload: { by } })
const closed: CounterEvent = { type: 'Closed', payload: {} }

describe('loadStream', () => {
  it('refuses a stream nobody opened', async () => {
    const events = createInMemoryEventStore()

    const outcome = await Effect.runPromise(Effect.either(loadStream(counterAggregate, events, id)))

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new NotFound('Le compteur est introuvable.'),
    )
  })
})

describe('decideOn', () => {
  it('appends the decision after the history, rebuilds the state and tells the revision', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const decided = await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', (current) =>
        Either.right([moved(current.count + 10)]),
      ),
    )

    expect(decided).toEqual({ state: { count: 12, closed: false }, revision: 2 })
    expect(events.all().map((e) => [e.revision, e.type, e.actorId])).toEqual([
      [1, 'Opened', 'alice'],
      [2, 'Moved', 'bob'],
    ])
  })

  it('refuses a decision rendered from a revision the stream has moved past', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), moved(2)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 1),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(ConcurrencyError)
    expect(events.all()).toHaveLength(2)
  })

  it('accepts a decision rendered from the current revision, and one rendered from no form', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 1),
    )
    await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)])),
    )

    expect(events.all()).toHaveLength(3)
  })

  it('compares zero like any revision: no stream stands at zero', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () => Either.right([moved(1)]), 0),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toBeInstanceOf(ConcurrencyError)
    expect(events.all()).toHaveLength(1)
  })

  it('writes nothing when the decision changes nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const decided = await Effect.runPromise(
      decideOn(counterAggregate, events, id, 'bob', () => Either.right([])),
    )

    expect(decided).toEqual({ state: { count: 1, closed: false }, revision: 1 })
    expect(events.all()).toHaveLength(1)
  })

  it('refuses a deleted aggregate as unknown, before any decision', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1), closed], { actorId: 'alice' }))
    let decided = 0

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () => {
          decided++
          return Either.right([moved(1)])
        }),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(
      new NotFound('Le compteur est introuvable.'),
    )
    expect(decided).toBe(0)
    expect(events.all()).toHaveLength(2)
  })

  it('lets the decision refuse, writing nothing', async () => {
    const events = createInMemoryEventStore()
    await Effect.runPromise(events.append(stream, 0, [opened(1)], { actorId: 'alice' }))

    const outcome = await Effect.runPromise(
      Effect.either(
        decideOn(counterAggregate, events, id, 'bob', () =>
          Either.left(new Rejected('Trop haut.', 'count')),
        ),
      ),
    )

    expect(Either.isLeft(outcome) && outcome.left).toEqual(new Rejected('Trop haut.', 'count'))
    expect(events.all()).toHaveLength(1)
  })
})
