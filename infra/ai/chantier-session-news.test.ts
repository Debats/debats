import { describe, expect, it } from 'vitest'
import { agentStatus, newsOf, SessionEventLike } from './chantier-session-news'

const said = (id: string, type: string, text: string, at: string): SessionEventLike => ({
  id,
  type,
  processed_at: at,
  content: [{ type: 'text', text }],
})

const idle = (id: string, stop: string, at: string): SessionEventLike => ({
  id,
  type: 'session.status_idle',
  processed_at: at,
  stop_reason: { type: stop },
})

describe('agentStatus', () => {
  it('is at work while the session runs or recovers', () => {
    expect(agentStatus('running', 'end_turn')).toBe('working')
    expect(agentStatus('rescheduling', undefined)).toBe('working')
  })

  it('waits for a person when it ended its turn, or when nothing says otherwise', () => {
    expect(agentStatus('idle', 'end_turn')).toBe('waiting')
    expect(agentStatus('idle', undefined)).toBe('waiting')
  })

  it('is blocked when it waits for the console: a budget, a decision, a refusal', () => {
    expect(agentStatus('idle', 'budget_reached')).toBe('blocked')
    expect(agentStatus('idle', 'requires_action')).toBe('blocked')
    expect(agentStatus('idle', 'refusal')).toBe('blocked')
    expect(agentStatus('idle', 'retries_exhausted')).toBe('blocked')
  })

  it('has ended with its session', () => {
    expect(agentStatus('terminated', 'end_turn')).toBe('ended')
  })
})

describe('newsOf', () => {
  const events: SessionEventLike[] = [
    said('evt_1', 'user.message', 'Qui s’est positionné ?', '2026-11-10T10:00:00Z'),
    { id: 'evt_2', type: 'agent.thinking', processed_at: '2026-11-10T10:00:05Z' },
    { id: 'evt_3', type: 'agent.tool_use', processed_at: '2026-11-10T10:00:08Z' },
    said('evt_4', 'agent.message', '# La taxe Zucman\n\nJe commence.', '2026-11-10T10:00:20Z'),
    idle('evt_5', 'end_turn', '2026-11-10T10:00:21Z'),
  ]

  it('keeps the words of the person and of the agent, nothing else', () => {
    expect(newsOf('idle', events).messages).toEqual([
      { eventId: 'evt_1', role: 'person', text: 'Qui s’est positionné ?' },
      { eventId: 'evt_4', role: 'agent', text: '# La taxe Zucman\n\nJe commence.' },
    ])
  })

  it('moves the cursor to the latest processing time read', () => {
    expect(newsOf('idle', events).until).toBe('2026-11-10T10:00:21Z')
  })

  it('reads the status from the last stop of the batch', () => {
    expect(newsOf('idle', events).status).toBe('waiting')
    expect(
      newsOf('idle', [...events, idle('evt_6', 'budget_reached', '2026-11-10T10:01:00Z')]).status,
    ).toBe('blocked')
  })

  it('falls back on the last stop known from before when the batch has none', () => {
    const before = idle('evt_0', 'budget_reached', '2026-11-10T09:00:00Z')
    expect(newsOf('idle', [], before).status).toBe('blocked')
    expect(newsOf('idle', []).status).toBe('waiting')
  })

  it('reads an empty batch as nothing to move', () => {
    expect(newsOf('running', [])).toEqual({ status: 'working', messages: [], until: null })
  })

  it('drops a message that holds no text', () => {
    const redacted: SessionEventLike = {
      id: 'evt_9',
      type: 'agent.message',
      processed_at: '2026-11-10T10:02:00Z',
      content: [{ type: 'redacted' }],
    }
    expect(newsOf('idle', [redacted]).messages).toEqual([])
  })
})
