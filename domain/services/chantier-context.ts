import { ChantierMessageRole } from '../entities/chantier'

/**
 * The context of the agent of a chantier: everything it reads again at each
 * step, which is what a step costs. It only grows as the agent searches,
 * and nothing in a session brings it back down: past a size, carrying on in
 * a new session, told what was said so far, costs less than each step does.
 */

/**
 * From how many tokens a context is worth reducing. Measured on the first
 * sixteen chantiers (November 2026): the requests made above this size were
 * four fifths of what the agents spent.
 */
export const CONTEXT_WORTH_REDUCING = 200_000

/** Whether the context has grown to where reducing it pays; a size never read says nothing */
export const contextWorthReducing = (tokens: number | null): boolean =>
  tokens !== null && tokens >= CONTEXT_WORTH_REDUCING

/** How long what is handed over may be, in characters: the latest turns are what the agent needs */
export const HANDOVER_MAX_CHARS = 24_000

export const HANDOVER_TRUNCATED = '(Le début de la conversation n’est pas repris.)'

const BETWEEN_TURNS = '\n\n'

const SPEAKERS: Partial<Record<ChantierMessageRole, string>> = {
  person: 'La personne',
  agent: 'Vous',
}

type Said = { role: ChantierMessageRole; text: string }

/**
 * What a thread hands over to the session that takes a chantier over: the
 * person's words and the agent's, each named, in order. The review notices
 * are left out, the drafts themselves saying what became of them. A thread
 * too long keeps its latest turns, whole, and at least the last one; null
 * when nobody spoke.
 */
export function handoverOf(messages: readonly Said[]): string | null {
  const turns = messages.flatMap(({ role, text }) => {
    const speaker = SPEAKERS[role]
    return speaker ? [`${speaker} : ${text}`] : []
  })
  if (turns.length === 0) return null

  const kept: string[] = []
  let length = 0
  for (const turn of [...turns].reverse()) {
    if (kept.length > 0 && length + turn.length > HANDOVER_MAX_CHARS) break
    kept.unshift(turn)
    length += turn.length
  }
  return [...(kept.length < turns.length ? [HANDOVER_TRUNCATED] : []), ...kept].join(BETWEEN_TURNS)
}
