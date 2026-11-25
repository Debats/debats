import { describe, it, expect } from 'vitest'
import { relationOf, standsOf, standsWithLeading, supportOf, Taken } from './stands'

const ALL_CONTRADICTORY = (a: string, b: string) => a === b

/** « Alma took position p on subject s, that day » */
const took = (
  authorKey: string,
  subjectId: string,
  position: string,
  day = '2026-01-01',
): Taken<{ id: string }> => ({
  authorKey,
  subjectId,
  position: { id: position },
  statedAt: new Date(day),
  recordedAt: new Date(day),
})

const held = (
  stands: ReturnType<typeof standsOf<{ id: string }>>,
  author: string,
  subject: string,
) =>
  stands
    .get(author)
    ?.get(subject)
    ?.map(({ id }) => id)

describe('standsOf', () => {
  it('reads where each author stands on each subject she spoke on', () => {
    const stands = standsOf(
      [took('alma', 's1', 'a'), took('alma', 's2', 'c'), took('boris', 's1', 'b')],
      ALL_CONTRADICTORY,
    )

    expect(held(stands, 'alma', 's1')).toEqual(['a'])
    expect(held(stands, 'alma', 's2')).toEqual(['c'])
    expect(held(stands, 'boris', 's1')).toEqual(['b'])
    expect(held(stands, 'boris', 's2')).toBeUndefined()
  })

  it('keeps the position she holds today, not the one she left for it', () => {
    const stands = standsOf(
      [took('alma', 's1', 'a', '2024-01-01'), took('alma', 's1', 'b', '2026-01-01')],
      ALL_CONTRADICTORY,
    )

    expect(held(stands, 'alma', 's1')).toEqual(['b'])
  })

  it('keeps together the positions that were judged compatible', () => {
    const stands = standsOf(
      [took('alma', 's1', 'a', '2024-01-01'), took('alma', 's1', 'b', '2026-01-01')],
      () => true,
    )

    expect(held(stands, 'alma', 's1')).toEqual(['a', 'b'])
  })
})

describe('relationOf', () => {
  const a = [{ id: 'a' }]
  const b = [{ id: 'b' }]

  it('puts with each other those who share a position', () => {
    expect(relationOf([{ id: 'a' }, { id: 'c' }], a, ALL_CONTRADICTORY)).toBe('with')
  })

  it('puts apart those who share none, one of hers contradicting one of theirs', () => {
    expect(relationOf(a, b, ALL_CONTRADICTORY)).toBe('apart')
  })

  it('puts beside each other those who only hold compatible positions', () => {
    expect(relationOf(a, b, () => true)).toBe('beside')
  })
})

describe('supportOf', () => {
  const stands = standsOf(
    [
      took('alma', 's1', 'a'),
      took('boris', 's1', 'a'),
      took('chloe', 's1', 'b'),
      took('david', 's2', 'c'),
    ],
    ALL_CONTRADICTORY,
  )
  const support = supportOf(stands)

  it('counts who holds each position of a subject, and who holds any', () => {
    expect(support.get('s1')?.authors).toBe(3)
    expect(support.get('s1')?.byPosition.get('a')).toBe(2)
    expect(support.get('s1')?.byPosition.get('b')).toBe(1)
    expect(support.get('s2')?.authors).toBe(1)
  })

  it('does not count a position for who left it', () => {
    const moved = standsOf(
      [took('alma', 's1', 'a', '2024-01-01'), took('alma', 's1', 'b', '2026-01-01')],
      ALL_CONTRADICTORY,
    )

    expect(supportOf(moved).get('s1')?.byPosition.get('a')).toBeUndefined()
  })

  it('says who stands with the most supported position, a tie counting for both', () => {
    const tied = supportOf(
      standsOf([took('alma', 's1', 'a'), took('boris', 's1', 'b')], ALL_CONTRADICTORY),
    ).get('s1')!

    expect(standsWithLeading([{ id: 'a' }], support.get('s1')!)).toBe(true)
    expect(standsWithLeading([{ id: 'b' }], support.get('s1')!)).toBe(false)
    expect(standsWithLeading([{ id: 'a' }], tied)).toBe(true)
    expect(standsWithLeading([{ id: 'b' }], tied)).toBe(true)
  })
})
