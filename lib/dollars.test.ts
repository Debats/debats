import { describe, expect, it } from 'vitest'
import { dollars } from './dollars'

/* Intl puts no-break spaces around the figures: the test reads them as plain ones */
const plain = (text: string) => text.replace(/[  ]/g, ' ')

describe('dollars', () => {
  it('writes cents as dollars, the French way', () => {
    expect(plain(dollars(2173))).toBe('21,73 $US')
    expect(plain(dollars(2000))).toBe('20,00 $US')
    expect(plain(dollars(0))).toBe('0,00 $US')
  })
})
