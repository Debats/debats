/**
 * What the agent of a chantier has spent against the cap it runs under.
 * In US cents, at list price: the only currency a session is capped in.
 */
export type AgentBudget = {
  spentCents: number
  capCents: number
  /** The agent stopped at its cap, and stays stopped until the cap is pushed further */
  reached: boolean
}

/** How far one push moves the cap: ten dollars */
export const BUDGET_STEP_CENTS = 1000

/**
 * The cap one step further. A session stops a little past its cap, the
 * request that crossed it being finished; when it went a whole step past,
 * the step is counted from what was spent, so a push always leaves a step
 * to spend.
 */
export function capPushedFurther(
  { spentCents, capCents }: Pick<AgentBudget, 'spentCents' | 'capCents'>,
  stepCents: number = BUDGET_STEP_CENTS,
): number {
  const pushed = capCents + stepCents
  return pushed > spentCents ? pushed : spentCents + stepCents
}
