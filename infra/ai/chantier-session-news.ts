import { AgentMessage, AgentNews, AgentStatus } from '../../domain/services/chantier-agent'

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

const isIdle = (event: SessionEventLike) => event.type === 'session.status_idle'

/**
 * What a batch of events says. Messages are the person's and the agent's
 * words; the cursor is the latest processing time read; the status comes
 * from the session, refined by the last stop reason known, which may come
 * from an earlier batch.
 */
export function newsOf(
  session: SessionStatus,
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
  return { status: agentStatus(session, lastIdle?.stop_reason?.type), messages, until }
}
