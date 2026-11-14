import { Effect, pipe } from 'effect'
import { Chantier, ChantierMessage } from '../entities/chantier'
import { ChantierRepository, ChantierUpdate } from '../repositories/chantier-repository'
import { AgentNews, ChantierAgent } from '../services/chantier-agent'
import { AgentBudget } from '../services/chantier-budget'
import { chantierTitle } from '../services/chantier-title'
import { chantierFound } from './chantier-preconditions'
import { chantierSpend } from './chantier-spend'
import { allowedTo } from './preconditions'
import { ContributorIdentity } from './types'

type RefreshChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
}

export type RefreshedChantier = {
  chantier: Chantier
  messages: ChantierMessage[]
  /** What the session spent against its cap, or what a closed chantier kept of it; null when it has no session, or runs without a cap */
  budget: AgentBudget | null
}

const chantiers = Effect.serviceFunctions(ChantierRepository)
const agent = Effect.serviceFunctions(ChantierAgent)

/**
 * The status the news gives the chantier. A person's closing stands. And an
 * agent at work only comes to wait once it has answered: a session that has
 * not yet taken the message it was just sent still reads as idle, and that
 * must not be mistaken for an answer.
 */
function statusFrom(chantier: Chantier, news: AgentNews, answered: boolean): ChantierUpdate {
  if (chantier.status === 'closed') return {}
  if (chantier.status === 'working' && news.status === 'waiting' && !answered) return {}
  return { status: news.status }
}

/**
 * What the chantier changes into on the news: the agent's status, a name
 * once the agent gave its first answer, the cursor when something was read.
 */
export function changesFrom(chantier: Chantier, news: AgentNews): ChantierUpdate {
  const firstAnswer = news.messages.find(({ role }) => role === 'agent')?.text
  return {
    ...statusFrom(chantier, news, firstAnswer !== undefined),
    ...(chantier.title === null && firstAnswer
      ? { title: chantierTitle(chantier.brief, firstAnswer) }
      : {}),
    ...(news.until ? { lastEventAt: news.until } : {}),
  }
}

/**
 * Brings the site up to date with the session: the agent's new messages are
 * mirrored, its status taken. A person's own messages are mirrored when
 * sent, so the news only contributes the agent's. A chantier without a
 * session has nothing to refresh and is read as it is, and so is one a
 * person closed: its events are not read, and its budget is what it kept
 * of its spend.
 */
export function refreshChantierUseCase(params: RefreshChantierParams) {
  /* Closed, an agent is not held by its cap: there is nothing left to resume, so the cap is never « reached » */
  const unmoved = (chantier: Chantier) =>
    Effect.map(chantierSpend(chantier), (spend) => ({
      chantier,
      budget: spend && { ...spend, reached: false },
    }))

  const mirror = (chantier: Chantier, sessionId: string, contributorId: string) =>
    pipe(
      agent.newsSince(sessionId, chantier.lastEventAt),
      Effect.flatMap((news) =>
        pipe(
          chantiers.addMessages(
            chantier.id,
            news.messages
              .filter(({ role }) => role === 'agent')
              .map(({ eventId, role, text }) => ({ eventId, role, text })),
          ),
          Effect.flatMap(() =>
            chantiers.update(chantier.id, changesFrom(chantier, news), contributorId),
          ),
          Effect.map((updated) => ({ chantier: updated ?? chantier, budget: news.budget })),
        ),
      ),
    )

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'suivre un chantier'),
      chantier: chantierFound(params.chantierId),
    }),
    Effect.flatMap(({ contributor, chantier }) =>
      chantier.sessionId && chantier.status !== 'closed'
        ? mirror(chantier, chantier.sessionId, contributor.id)
        : unmoved(chantier),
    ),
    Effect.flatMap(({ chantier, budget }) =>
      Effect.map(chantiers.findMessages(chantier.id), (messages) => ({
        chantier,
        messages,
        budget,
      })),
    ),
  )
}
