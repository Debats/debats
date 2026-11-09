import { describe, expect, it } from 'vitest'
import { freshAdvice, remarksIn } from './fresh-advice'

const ADVICE = [
  { field: 'quote', verdict: 'problem', note: 'La phrase n’énonce pas la position.' },
  { field: 'sourceName', verdict: 'ok', note: 'Conforme.' },
] as const

describe('freshAdvice', () => {
  it('keys the advice by field', () => {
    expect(freshAdvice(ADVICE, new Set())).toEqual({
      quote: { verdict: 'problem', note: 'La phrase n’énonce pas la position.' },
      sourceName: { verdict: 'ok', note: 'Conforme.' },
    })
  })

  /* The text that was read is not the text on screen any more */
  it('drops what was said about a field written since the reading was asked for', () => {
    expect(freshAdvice(ADVICE, new Set(['quote']))).toEqual({
      sourceName: { verdict: 'ok', note: 'Conforme.' },
    })
  })

  it('ignores a written field that got no advice', () => {
    expect(Object.keys(freshAdvice(ADVICE, new Set(['statedAt'])))).toEqual(['quote', 'sourceName'])
  })
})

describe('remarksIn', () => {
  it('counts the fields that got something other than « conforme »', () => {
    expect(remarksIn(freshAdvice(ADVICE, new Set()))).toBe(1)
    expect(remarksIn(freshAdvice(ADVICE, new Set(['quote'])))).toBe(0)
  })
})
