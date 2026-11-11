import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { AgentNews, AgentUnavailable, ChantierAgent } from '../../domain/services/chantier-agent'
import { chantierTitle } from '../../domain/services/chantier-title'
import { SITE_URL } from '../../app/site'
import { CHANTIER_AGENT_SYSTEM, chantierOpeningMessage } from './chantier-agent-prompt'
import { newsOf, SessionEventLike } from './chantier-session-news'

/**
 * What a managed session needs to run a chantier. All of it is set up once
 * (scripts/chantier-agent-setup.ts) and read from the environment here.
 */
export interface ChantierAgentConfig {
  agentId: string
  environmentId: string
  vaultIds: string[]
  repositoryUrl: string
  /** Needed for a private repository */
  repositoryToken?: string
  siteUrl: string
  /** The hard cap on what one session may spend, in US cents */
  budgetCents: number
}

export const DEFAULT_REPOSITORY_URL = 'https://github.com/Debats/debats'
const DEFAULT_BUDGET_CENTS = 2000
/** How many events are looked back through for the last stop, when a batch has none */
const LOOKBACK = 50

export const NOT_CONFIGURED =
  'L’agent des chantiers n’est pas configuré : CHANTIER_AGENT_ID et CHANTIER_ENVIRONMENT_ID manquent.'
export const UNREACHABLE = 'L’agent ne répond pas pour le moment. Réessayez dans un instant.'
export const NEEDS_CONSOLE =
  'L’agent attend une décision ou un budget dans la console Anthropic : il ne prend pas de message pour l’instant.'

/** The configuration the environment gives, or null when the chantiers are not set up */
export function chantierAgentConfig(
  env: Record<string, string | undefined> = process.env,
): ChantierAgentConfig | null {
  const agentId = env.CHANTIER_AGENT_ID
  const environmentId = env.CHANTIER_ENVIRONMENT_ID
  if (!agentId || !environmentId) return null
  return {
    agentId,
    environmentId,
    vaultIds: env.CHANTIER_VAULT_ID ? [env.CHANTIER_VAULT_ID] : [],
    repositoryUrl: env.CHANTIER_REPOSITORY_URL || DEFAULT_REPOSITORY_URL,
    repositoryToken: env.CHANTIER_REPOSITORY_TOKEN || undefined,
    /* The site itself, unless the agent is pointed at another one */
    siteUrl: env.DEBATS_URL || SITE_URL,
    budgetCents: Number(env.CHANTIER_BUDGET_CENTS) || DEFAULT_BUDGET_CENTS,
  }
}

/** What stopped a call, in the words the person reads; the cause goes to Sentry */
function unavailable(error: unknown): AgentUnavailable {
  Sentry.captureException(error, { tags: { feature: 'chantier' } })
  const status = error instanceof Anthropic.APIError ? error.status : undefined
  return new AgentUnavailable(status === 400 ? NEEDS_CONSOLE : UNREACHABLE, error)
}

const attempt = <A>(run: () => Promise<A>) => Effect.tryPromise({ try: run, catch: unavailable })

/**
 * The chantier agent as a Managed Agents session: one session per chantier,
 * opened on the brief with the repository mounted and the vault attached,
 * told the person's messages, read back for its own.
 */
export function createChantierAgent(config: ChantierAgentConfig | null): ChantierAgent {
  if (!config) {
    const notConfigured = Effect.fail(new AgentUnavailable(NOT_CONFIGURED))
    return {
      open: () => notConfigured,
      tell: () => notConfigured,
      newsSince: () => notConfigured,
      interrupt: () => notConfigured,
      forget: () => notConfigured,
    }
  }

  const client = new Anthropic()
  const sessions = client.beta.sessions

  /* From the cursor included: an event that shares its time is read again, and mirrored once */
  const eventsSince = async (sessionId: string, after: string | null) => {
    const events: SessionEventLike[] = []
    const page = sessions.events.list(sessionId, {
      order: 'asc',
      ...(after ? { 'created_at[gte]': after } : {}),
    })
    for await (const event of page) events.push(event as SessionEventLike)
    return events
  }

  /* The last stop may have been read in an earlier batch: the last few events are looked at again, one page only */
  const lastIdleOf = async (sessionId: string): Promise<SessionEventLike | undefined> => {
    const page = await sessions.events.list(sessionId, { order: 'desc', limit: LOOKBACK })
    return page.data.find((event) => event.type === 'session.status_idle') as
      | SessionEventLike
      | undefined
  }

  return {
    open: (chantier) =>
      attempt(async () => {
        const session = await sessions.create({
          agent: config.agentId,
          environment_id: config.environmentId,
          title: chantier.title ?? chantierTitle(chantier.brief),
          metadata: { chantier: chantier.id },
          vault_ids: config.vaultIds,
          budget: {
            type: 'limit',
            max_list_cost: { amount: String(config.budgetCents), currency: 'USD' },
          },
          resources: [
            {
              type: 'github_repository',
              url: config.repositoryUrl,
              ...(config.repositoryToken ? { authorization_token: config.repositoryToken } : {}),
            },
          ],
          initial_events: [
            {
              type: 'user.message',
              content: [{ type: 'text', text: chantierOpeningMessage(chantier, config.siteUrl) }],
            },
          ],
        })
        return { sessionId: session.id }
      }),

    tell: (sessionId, text) =>
      Effect.asVoid(
        attempt(() =>
          sessions.events.send(sessionId, {
            events: [{ type: 'user.message', content: [{ type: 'text', text }] }],
          }),
        ),
      ),

    newsSince: (sessionId, after): Effect.Effect<AgentNews, AgentUnavailable> =>
      attempt(async () => {
        const [session, events] = await Promise.all([
          sessions.retrieve(sessionId),
          eventsSince(sessionId, after),
        ])
        const needsLastStop =
          session.status === 'idle' && !events.some((e) => e.type === 'session.status_idle')
        const lastIdle = needsLastStop ? await lastIdleOf(sessionId) : undefined
        return newsOf(session.status, events, lastIdle)
      }),

    interrupt: (sessionId) =>
      Effect.asVoid(
        attempt(() => sessions.events.send(sessionId, { events: [{ type: 'user.interrupt' }] })),
      ),

    /* A session Anthropic no longer has is as forgotten as one it just erased */
    forget: (sessionId) =>
      Effect.asVoid(
        attempt(() =>
          sessions.delete(sessionId).catch((error: unknown) => {
            if (error instanceof Anthropic.APIError && error.status === 404) return
            throw error
          }),
        ),
      ),
  }
}
