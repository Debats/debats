/**
 * A chantier: a brief an admin gives the content agent, the drafts the agent
 * produces from it, and the conversation that made them.
 *
 * The agent runs in a session the site does not host. What the site keeps is
 * what must outlive that session: the brief, the drafts, the conversation
 * mirrored message by message, and the last status it heard of.
 */

export const CHANTIER_STATUSES = [
  'pending',
  'working',
  'waiting',
  'blocked',
  'ended',
  'closed',
] as const

/**
 * - pending: adopted with drafts already there, the agent not launched yet
 * - working: the agent is at it
 * - waiting: the agent answered and waits for a person
 * - blocked: the agent waits for something only the Anthropic console can give
 * - ended: the session is over, by completion or by error, and cannot be resumed
 * - closed: a person closed the chantier
 */
export type ChantierStatus = (typeof CHANTIER_STATUSES)[number]

export const isChantierStatus = (value: string): value is ChantierStatus =>
  (CHANTIER_STATUSES as readonly string[]).includes(value)

export type Chantier = {
  id: string
  brief: string
  /** Named by the agent in its first answer; null until then */
  title: string | null
  status: ChantierStatus
  /** The session that runs it; null while it is being opened, or when opening failed */
  sessionId: string | null
  /** When the last mirrored session event was processed: where the next mirror reads from */
  lastEventAt: string | null
  /** The section titles in the reading order the agent chose; a section it did not list comes after */
  sections: string[]
  createdBy: string
  updatedBy: string
  createdAt: Date
  updatedAt: Date
}

/** Who speaks in the thread: the person, the agent, or the site relaying a review decision */
export type ChantierMessageRole = 'person' | 'agent' | 'review'

export type ChantierMessage = {
  id: string
  chantierId: string
  role: ChantierMessageRole
  text: string
  /** The session event this mirrors, when it mirrors one */
  eventId: string | null
  createdAt: Date
}

/** A chantier still takes messages: it is neither closed by a person nor ended by its session */
export const isOpen = (chantier: Chantier): boolean =>
  chantier.status !== 'closed' && chantier.status !== 'ended'

/** How each status reads on screen */
export const CHANTIER_STATUS_LABELS: Record<ChantierStatus, string> = {
  pending: 'Agent non lancé',
  working: 'L’agent travaille',
  waiting: 'L’agent vous attend',
  blocked: 'Bloqué côté Anthropic',
  ended: 'Session terminée',
  closed: 'Clôturé',
}
