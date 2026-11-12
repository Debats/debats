import { describe, it, expect } from 'vitest'
import {
  dailyDebate,
  DAILY_MIN_VOICES,
  Debate,
  debateShares,
  leadingPositions,
  newestDebates,
  recentSince,
} from './home-debates'

const debate = (id: string, over: Partial<Debate> = {}): Debate => ({
  id,
  title: `Sujet ${id}`,
  slug: `sujet-${id}`,
  problem: 'Faut-il ?',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  voices: DAILY_MIN_VOICES,
  statementsCount: DAILY_MIN_VOICES,
  positions: [],
  ...over,
})

const position = (id: string, voices: number) => ({
  id,
  title: `Position ${id}`,
  slug: `position-${id}`,
  voices,
})

const noon = (day: string) => new Date(`${day}T12:00:00Z`)

describe('dailyDebate', () => {
  it('never picks a subject fewer than ten voices spoke on', () => {
    const debates = [
      debate('thin', { voices: DAILY_MIN_VOICES - 1 }),
      debate('full', { voices: DAILY_MIN_VOICES }),
    ]

    for (let day = 1; day <= 28; day++) {
      const picked = dailyDebate(debates, new Date(Date.UTC(2026, 1, day, 12)))
      expect(picked?.id).toBe('full')
    }
  })

  it('has no subject of the day when none has gathered ten voices', () => {
    expect(dailyDebate([debate('thin', { voices: 3 })], noon('2026-11-13'))).toBeNull()
    expect(dailyDebate([], noon('2026-11-13'))).toBeNull()
  })

  it('picks the same subject all day, whatever order the subjects were read in', () => {
    const debates = ['a', 'b', 'c', 'd', 'e'].map((id) => debate(id))

    const morning = dailyDebate(debates, new Date('2026-11-13T07:00:00Z'))
    const evening = dailyDebate([...debates].reverse(), new Date('2026-11-13T20:00:00Z'))

    expect(evening?.id).toBe(morning?.id)
  })

  it('does not pick the same subject every day', () => {
    const debates = ['a', 'b', 'c', 'd', 'e'].map((id) => debate(id))

    const picked = new Set(
      Array.from(
        { length: 30 },
        (_, day) => dailyDebate(debates, new Date(Date.UTC(2026, 0, day + 1, 12)))?.id,
      ),
    )

    expect(picked.size).toBeGreaterThan(1)
  })
})

describe('debateShares', () => {
  it('gives each position its part of the voices, most supported first', () => {
    const shares = debateShares(
      debate('nuclear', {
        positions: [position('exit', 14), position('more', 17), position('vote', 4)],
      }),
    )

    expect(shares.map((share) => [share.key, share.count])).toEqual([
      ['more', 17],
      ['exit', 14],
      ['vote', 4],
    ])
    expect(shares[0].share).toBeCloseTo(17 / 35)
    expect(shares.reduce((sum, share) => sum + share.share, 0)).toBeCloseTo(1)
  })

  it('leaves out a position nobody has taken: it has no part to draw', () => {
    const shares = debateShares(
      debate('s', { positions: [position('held', 3), position('empty', 0)] }),
    )

    expect(shares.map((share) => share.key)).toEqual(['held'])
    expect(shares[0].share).toBe(1)
  })

  it('draws nothing for a subject nobody spoke on', () => {
    expect(debateShares(debate('s', { positions: [position('empty', 0)] }))).toEqual([])
  })

  it('keeps positions tied in voices in the order of their titles', () => {
    const shares = debateShares(
      debate('s', {
        positions: [
          { ...position('b', 6), title: 'Droit nouveau' },
          { ...position('a', 6), title: 'Application de la loi' },
        ],
      }),
    )

    expect(shares.map((share) => share.key)).toEqual(['a', 'b'])
  })
})

describe('leadingPositions', () => {
  it('names the two most supported positions, the ones whose voices face each other', () => {
    const leading = leadingPositions(
      debate('s', { positions: [position('c', 1), position('a', 9), position('b', 5)] }),
    )

    expect(leading.map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('does not set a position nobody has taken against the leading one', () => {
    const leading = leadingPositions(
      debate('s', { positions: [position('a', 9), position('empty', 0)] }),
    )

    expect(leading.map((p) => p.id)).toEqual(['a'])
  })
})

describe('recentSince', () => {
  it('counts as recent what the last seven days brought', () => {
    expect(recentSince(new Date('2026-11-13T09:30:00Z'))).toEqual(new Date('2026-11-06T09:30:00Z'))
  })
})

describe('newestDebates', () => {
  it('lists the subjects opened last, newest first, up to the limit', () => {
    const debates = [
      debate('old', { createdAt: new Date('2026-10-01T00:00:00Z') }),
      debate('new', { createdAt: new Date('2026-11-12T00:00:00Z') }),
      debate('mid', { createdAt: new Date('2026-11-04T00:00:00Z') }),
    ]

    expect(newestDebates(debates, 2).map((d) => d.id)).toEqual(['new', 'mid'])
  })
})
