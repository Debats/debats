import { describe, it, expect } from 'vitest'
import {
  alignOnSubject,
  alignmentOf,
  groupVoices,
  wilsonInterval,
  GroupDefinition,
  Voice,
} from './group-alignment'

const voice = (authorKey: string, positionId: string): Voice => ({ authorKey, positionId })

describe('wilsonInterval', () => {
  it('spans the whole range when nobody spoke', () => {
    expect(wilsonInterval(0, 0)).toEqual({ low: 0, high: 1 })
  })

  it('stays inside zero and one on a unanimous group', () => {
    const { low, high } = wilsonInterval(5, 5)
    expect(low).toBeGreaterThan(0)
    expect(high).toBe(1)
  })

  it('narrows as the group grows, around the same share', () => {
    const few = wilsonInterval(4, 5)
    const many = wilsonInterval(40, 50)
    expect(many.high - many.low).toBeLessThan(few.high - few.low)
  })

  it('brackets four voices out of five between 38 and 96 percent', () => {
    const { low, high } = wilsonInterval(4, 5)
    expect(Math.round(low * 100)).toBe(38)
    expect(Math.round(high * 100)).toBe(96)
  })
})

describe('groupVoices', () => {
  const hers = new Set(['pour'])

  it('counts an author once, whatever the number of statements', () => {
    const voices = [voice('a', 'pour'), voice('a', 'pour'), voice('b', 'contre')]
    expect(groupVoices(voices, hers)).toEqual({ withAuthor: 1, total: 2 })
  })

  it('counts an author who took several positions as aligned once one is hers', () => {
    const voices = [voice('a', 'contre'), voice('a', 'pour')]
    expect(groupVoices(voices, hers)).toEqual({ withAuthor: 1, total: 1 })
  })

  it('keeps only the members when a group is given', () => {
    const voices = [voice('a', 'pour'), voice('b', 'contre'), voice('c', 'pour')]
    expect(groupVoices(voices, hers, new Set(['a', 'b']))).toEqual({ withAuthor: 1, total: 2 })
  })

  it('counts nobody when no member of the group spoke', () => {
    const voices = [voice('a', 'pour')]
    expect(groupVoices(voices, hers, new Set(['z']))).toEqual({ withAuthor: 0, total: 0 })
  })
})

describe('alignmentOf', () => {
  it('reads the share of the group and its distance to the reference', () => {
    const alignment = alignmentOf({ withAuthor: 4, total: 5 }, 0.46)
    expect(alignment.share).toBeCloseTo(0.8)
    expect(alignment.deviation).toBeCloseTo(0.34)
  })

  it('is not conclusive when the interval contains the reference', () => {
    // 4 voices out of 5 span 38 to 96 percent: the reference sits inside
    expect(alignmentOf({ withAuthor: 4, total: 5 }, 0.46).conclusive).toBe(false)
  })

  it('is conclusive when the interval leaves the reference out', () => {
    expect(alignmentOf({ withAuthor: 40, total: 50 }, 0.46).conclusive).toBe(true)
  })

  it('is never conclusive on an empty group', () => {
    const alignment = alignmentOf({ withAuthor: 0, total: 0 }, 0.46)
    expect(alignment.conclusive).toBe(false)
    expect(alignment.share).toBe(0)
  })
})

describe('alignOnSubject', () => {
  const hers = new Set(['pour'])
  const group = (key: string, members: string[]): GroupDefinition => ({
    key,
    kind: 'organisation',
    label: key,
    href: `/o/${key}`,
    members: new Set(members),
  })

  it('leaves the author out of the reference and of her own groups', () => {
    const voices = [voice('elle', 'pour'), voice('a', 'pour'), voice('b', 'contre')]
    const { everyone, rows } = alignOnSubject(voices, hers, 'elle', [group('parti', ['elle', 'a'])])
    expect(everyone).toMatchObject({ withAuthor: 1, total: 2 })
    expect(rows[0].alignment).toMatchObject({ withAuthor: 1, total: 1 })
  })

  it('drops a group whose members never spoke on the subject', () => {
    const voices = [voice('elle', 'pour'), voice('a', 'pour')]
    const { rows } = alignOnSubject(voices, hers, 'elle', [group('muet', ['z'])])
    expect(rows).toEqual([])
  })

  it('puts the most aligned group first', () => {
    const voices = [
      voice('elle', 'pour'),
      voice('a', 'pour'),
      voice('b', 'pour'),
      voice('c', 'contre'),
      voice('d', 'contre'),
    ]
    const { rows } = alignOnSubject(voices, hers, 'elle', [
      group('tiede', ['a', 'c']),
      group('chaud', ['a', 'b']),
    ])
    expect(rows.map((row) => row.key)).toEqual(['chaud', 'tiede'])
  })

  it('measures every group against the same reference', () => {
    const voices = [voice('elle', 'pour'), voice('a', 'pour'), voice('b', 'contre')]
    const { everyone, rows } = alignOnSubject(voices, hers, 'elle', [group('parti', ['a'])])
    expect(rows[0].alignment.deviation).toBeCloseTo(1 - everyone.share)
  })

  it('says nothing of the author when she is the only voice', () => {
    const { everyone, rows } = alignOnSubject([voice('elle', 'pour')], hers, 'elle', [])
    expect(everyone).toMatchObject({ total: 0, conclusive: false })
    expect(rows).toEqual([])
  })
})
