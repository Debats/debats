import { describe, expect, it } from 'vitest'
import { BUDGET_STEP_CENTS, capPushedFurther } from './chantier-budget'

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
