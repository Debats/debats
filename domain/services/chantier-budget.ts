/**
 * What the agent of a chantier has spent against the cap it runs under.
 * In US cents, at list price: the only currency a session is capped in.
 */
export type AgentSpend = {
  spentCents: number
  capCents: number
}

/**
 * What a session answers when asked what it spent. The figures are settled
 * once the session is at rest: while it runs, the request under way is not
 * counted yet, and what is read is only the spend so far.
 */
export type SpendReading = {
  /** Null when the session runs without a cap */
  spend: AgentSpend | null
  settled: boolean
}

/** The spend, and whether it stopped the agent: that takes the session's last stop, not the figures alone */
export type AgentBudget = AgentSpend & {
  /** The agent stopped at its cap, and stays stopped until the cap is pushed further */
  reached: boolean
}

/**
 * What a chantier cost so far, in US cents at list price: what its session
 * spends, and what the sessions it left behind when its context was
 * reduced had spent. A session that does not say what it spends leaves the
 * figure short of it.
 */
export const chantierCostCents = (spend: AgentSpend | null, earlierSpentCents: number): number =>
  (spend?.spentCents ?? 0) + earlierSpentCents

/** How far one push moves the cap: ten dollars */
export const BUDGET_STEP_CENTS = 1000

/**
 * How much of the cap is spent, from 0 to 1. A session stops a little past
 * its cap: the share stops at the whole. A cap that leaves nothing to spend
 * is wholly spent.
 */
export function spentShare({ spentCents, capCents }: AgentSpend): number {
  if (capCents <= 0) return 1
  return Math.min(1, Math.max(0, spentCents / capCents))
}

/**
 * The cap one step further. A session stops a little past its cap, the
 * request that crossed it being finished; when it went a whole step past,
 * the step is counted from what was spent, so a push always leaves a step
 * to spend.
 */
export function capPushedFurther(
  { spentCents, capCents }: AgentSpend,
  stepCents: number = BUDGET_STEP_CENTS,
): number {
  const pushed = capCents + stepCents
  return pushed > spentCents ? pushed : spentCents + stepCents
}
