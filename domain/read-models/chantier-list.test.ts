import { describe, expect, it } from 'vitest'
import { aChantier } from '../use-cases/chantier-test-helpers'
import { chantierListQuery, listChantiers, parseChantierListView } from './chantier-list'

describe('parseChantierListView', () => {
  it('hides the closed chantiers unless the address asks for all of them', () => {
    expect(parseChantierListView({})).toEqual({ withClosed: false })
    expect(parseChantierListView({ vue: 'tous' })).toEqual({ withClosed: true })
  })

  it('reads anything else as the default', () => {
    expect(parseChantierListView({ vue: 'autre' })).toEqual({ withClosed: false })
    expect(parseChantierListView({ vue: ['tous', 'tous'] })).toEqual({ withClosed: false })
  })
})

describe('chantierListQuery', () => {
  it('writes what parseChantierListView reads', () => {
    expect(chantierListQuery({ withClosed: false })).toBe('')
    expect(chantierListQuery({ withClosed: true })).toBe('?vue=tous')
  })
})

describe('listChantiers', () => {
  const working = aChantier({ id: 'working', status: 'working' })
  const ended = aChantier({ id: 'ended', status: 'ended' })
  const closed = aChantier({ id: 'closed', status: 'closed' })
  const closedToo = aChantier({ id: 'closed-too', status: 'closed' })

  it('leaves the closed chantiers out by default, and says how many it left out', () => {
    expect(listChantiers([closed, working, closedToo, ended], { withClosed: false })).toEqual({
      shown: [working, ended],
      closedCount: 2,
    })
  })

  it('shows them all on demand, in the order received', () => {
    expect(listChantiers([closed, working, closedToo, ended], { withClosed: true })).toEqual({
      shown: [closed, working, closedToo, ended],
      closedCount: 2,
    })
  })

  it('counts no closed chantier when there is none', () => {
    expect(listChantiers([working], { withClosed: false })).toEqual({
      shown: [working],
      closedCount: 0,
    })
  })
})
