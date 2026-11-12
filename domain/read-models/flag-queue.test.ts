import { describe, it, expect } from 'vitest'
import { flagsViewHref, parseFlagsView, queueOf, QueuedFlag } from './flag-queue'

const flag = (overrides: Partial<QueuedFlag>): QueuedFlag => ({
  id: 'flag',
  entity: { type: 'statement', id: 'statement-1' },
  reason: 'other',
  comment: 'Quelque chose ne va pas.',
  by: 'Camille R.',
  at: new Date('2026-11-10'),
  outcome: null,
  answer: null,
  settledBy: null,
  settledAt: null,
  ...overrides,
})

describe('queueOf', () => {
  it('gathers the flags of an entity in one entry, oldest flag first', () => {
    const queue = queueOf([
      flag({ id: 'late', at: new Date('2026-11-12') }),
      flag({ id: 'early', at: new Date('2026-11-09') }),
    ])

    expect(queue).toHaveLength(1)
    expect(queue[0].flags.map(({ id }) => id)).toEqual(['early', 'late'])
  })

  it('puts first the entity that has waited longest', () => {
    const subject = { type: 'subject' as const, id: 'subject-1' }
    const queue = queueOf([
      flag({ id: 'recent', at: new Date('2026-11-11') }),
      flag({ id: 'old', entity: subject, at: new Date('2026-11-01') }),
    ])

    expect(queue.map(({ entity }) => entity.id)).toEqual(['subject-1', 'statement-1'])
  })
})

describe('parseFlagsView', () => {
  it('shows the flags to settle, of every kind, unless the address says otherwise', () => {
    expect(parseFlagsView({})).toEqual({ settled: false, type: null })
    expect(parseFlagsView({ vue: 'traites', type: 'subject' })).toEqual({
      settled: true,
      type: 'subject',
    })
  })

  it('ignores a kind that is not one', () => {
    expect(parseFlagsView({ type: 'theme' })).toEqual({ settled: false, type: null })
  })
})

describe('flagsViewHref', () => {
  it('writes the view back as the address that shows it', () => {
    expect(flagsViewHref({ settled: false, type: null })).toBe('/signalements')
    expect(flagsViewHref({ settled: true, type: null })).toBe('/signalements?vue=traites')
    expect(flagsViewHref({ settled: true, type: 'statement' })).toBe(
      '/signalements?vue=traites&type=statement',
    )
  })
})
