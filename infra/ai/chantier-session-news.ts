import { AgentMessage, AgentNews, AgentStatus } from '../../domain/services/chantier-agent'
import { AgentBudget, AgentSpend, SpendReading } from '../../domain/services/chantier-budget'

/**
 * The part of a session event the site reads: who spoke and what they said,
 * when it was processed, and why a session stopped. Structural, so the
 * mapping is tested without the SDK.
 */
export type SessionEventLike = {
  id: string
  type: string
  processed_at?: string | null
  content?: readonly { type: string; text?: string }[]
  stop_reason?: { type: string }
}

export type SessionStatus = 'rescheduling' | 'running' | 'idle' | 'terminated'

const textOf = (event: SessionEventLike): string =>
  (event.content ?? [])
    .filter((block) => block.type === 'text' && block.text)
    .map((block) => block.text)
    .join('\n')
    .trim()

/** Where the agent stands: at work, waiting for a person, or waiting for the console */
export function agentStatus(session: SessionStatus, lastStop: string | undefined): AgentStatus {
  switch (session) {
    case 'running':
    case 'rescheduling':
      return 'working'
    case 'terminated':
      return 'ended'
    case 'idle':
      return lastStop === undefined || lastStop === 'end_turn' ? 'waiting' : 'blocked'
  }
}

/** The part of a session that says what it spent and under which cap: amounts in cents, as integer strings */
export type SessionSpendLike = {
  budget?: { max_list_cost: { amount: string } } | null
  usage?: { list_cost?: { amount: string } | null }
}

/** What the site reads of a session: where it stands, what it spent, under which cap */
export type SessionLike = SessionSpendLike & { status: SessionStatus }

/** What the session spent and the cap it runs under, in cents; null when it runs without a cap */
export function spendOf(session: SessionSpendLike): AgentSpend | null {
  if (!session.budget) return null
  return {
    spentCents: Number(session.usage?.list_cost?.amount ?? 0),
    capCents: Number(session.budget.max_list_cost.amount),
  }
}

/** What a session says of its spend, settled once nothing runs in it any more */
export function spendReadingOf(session: SessionLike): SpendReading {
  return {
    spend: spendOf(session),
    settled: session.status === 'idle' || session.status === 'terminated',
  }
}

/**
 * The budget of a session. That the cap is reached takes the stop and the
 * figures together. The figures alone do not tell: the cost reported is
 * rounded to the cent, and may equal the cap before the session has
 * stopped. The stop alone does not either: a cap just pushed further leaves
 * the old stop as the last one known until the session resumes.
 */
function budgetOf(session: SessionSpendLike, stoppedAtCap: boolean): AgentBudget | null {
  const spend = spendOf(session)
  return spend && { ...spend, reached: stoppedAtCap && spend.spentCents >= spend.capCents }
}

const isIdle = (event: SessionEventLike) => event.type === 'session.status_idle'

/**
 * What a batch of events says. Messages are the person's and the agent's
 * words; the cursor is the latest processing time read; the status comes
 * from the session, refined by the last stop reason known, which may come
 * from an earlier batch; the budget from what the session says it spent.
 */
export function newsOf(
  session: SessionLike,
  events: readonly SessionEventLike[],
  lastIdleBefore?: SessionEventLike,
): AgentNews {
  const messages: AgentMessage[] = events.flatMap((event) => {
    const role =
      event.type === 'agent.message' ? 'agent' : event.type === 'user.message' ? 'person' : null
    const text = role ? textOf(event) : ''
    return role && text ? [{ eventId: event.id, role, text }] : []
  })
  const lastIdle = [...events].reverse().find(isIdle) ?? lastIdleBefore
  const until = events.reduce<string | null>(
    (latest, { processed_at }) =>
      processed_at && (!latest || processed_at > latest) ? processed_at : latest,
    null,
  )
  const lastStop = lastIdle?.stop_reason?.type
  const stoppedAtCap = session.status === 'idle' && lastStop === 'budget_reached'
  const budget = budgetOf(session, stoppedAtCap)
  /* Stopped at a cap it now has room under: the session resumes by itself, it is not blocked */
  const resuming = stoppedAtCap && budget !== null && !budget.reached
  const status = resuming ? 'working' : agentStatus(session.status, lastStop)
  return { status, messages, until, budget }
}
