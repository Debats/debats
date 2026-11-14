import { describe, expect, it } from 'vitest'
import { BUDGET_STEP_CENTS, capPushedFurther, spentShare } from './chantier-budget'

describe('spentShare', () => {
  it('is the part of the cap already spent', () => {
    expect(spentShare({ spentCents: 500, capCents: 2000 })).toBe(0.25)
  })

  it('is nothing when nothing was spent', () => {
    expect(spentShare({ spentCents: 0, capCents: 2000 })).toBe(0)
  })

  it('stops at the whole cap when the session went past it', () => {
    expect(spentShare({ spentCents: 2173, capCents: 2000 })).toBe(1)
  })

  it('is the whole cap when the cap leaves nothing to spend', () => {
    expect(spentShare({ spentCents: 0, capCents: 0 })).toBe(1)
  })
})

describe('capPushedFurther', () => {
  it('moves the cap one step further', () => {
    expect(capPushedFurther({ spentCents: 500, capCents: 2000 })).toBe(2000 + BUDGET_STEP_CENTS)
  })

  it('still moves the cap one step when the session went a little past it', () => {
    expect(capPushedFurther({ spentCents: 2173, capCents: 2000 })).toBe(3000)
  })

  it('leaves a whole step to spend when the session went a step or more past its cap', () => {
    expect(capPushedFurther({ spentCents: 3000, capCents: 2000 })).toBe(4000)
    expect(capPushedFurther({ spentCents: 3400, capCents: 2000 })).toBe(4400)
  })
})
