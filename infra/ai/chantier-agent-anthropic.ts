import Anthropic from '@anthropic-ai/sdk'
import * as Sentry from '@sentry/nextjs'
import { Effect, pipe } from 'effect'
import {
  AgentNews,
  AgentUnavailable,
  BudgetReached,
  ChantierAgent,
} from '../../domain/services/chantier-agent'
import { capPushedFurther } from '../../domain/services/chantier-budget'
import { chantierTitle } from '../../domain/services/chantier-title'
import { SITE_URL } from '../../app/site'
import { CHANTIER_AGENT_SYSTEM, chantierOpeningMessage } from './chantier-agent-prompt'
import { newsOf, SessionEventLike, spendReadingOf } from './chantier-session-news'

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
  'L’agent a refusé cette demande : il attend peut-être une décision dans la console Anthropic. Le détail est dans Sentry.'
export const PUSH_REFUSED =
  'Anthropic a refusé de repousser le budget de cette session. Le détail est dans Sentry.'
export const NO_CAP = 'La session de ce chantier n’a pas de plafond de dépense : rien à repousser.'

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

/**
 * What stopped a call, in the words the person reads; the cause goes to
 * Sentry. A request the session refuses (400) says why in the words of what
 * was asked: a message is refused for one reason, a budget for another.
 */
const unavailable =
  (refused: string) =>
  (error: unknown): AgentUnavailable => {
    Sentry.captureException(error, { tags: { feature: 'chantier' } })
    const status = error instanceof Anthropic.APIError ? error.status : undefined
    return new AgentUnavailable(status === 400 ? refused : UNREACHABLE, error)
  }

const attempt = <A>(run: () => Promise<A>, refused: string = NEEDS_CONSOLE) =>
  Effect.tryPromise({ try: run, catch: unavailable(refused) })

/** How Anthropic opens the refusal of a session that met its cap; the request is a 400 like any other refusal */
const BUDGET_REFUSAL = 'session budget reached'

/**
 * Whether a call was refused because the session met its cap. Read on the
 * words of the refusal, the only place Anthropic says it; were they to
 * change, the refusal would be reported as any other, not passed over.
 */
export function refusedAtBudget(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (error as { status?: unknown }).status === 400 && error.message.includes(BUDGET_REFUSAL)
}

/** A message sent to a session: one stopped at its cap says so, and that is no fault to report */
const attemptToTell = (run: () => Promise<unknown>) =>
  Effect.tryPromise({
    try: run,
    catch: (error) =>
      refusedAtBudget(error) ? new BudgetReached() : unavailable(NEEDS_CONSOLE)(error),
  })

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
      spend: () => notConfigured,
      pushBudget: () => notConfigured,
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

  /* The session alone, its events left unread: one request, which is what a list of chantiers can afford */
  const spend = (sessionId: string) =>
    Effect.map(
      attempt(() => sessions.retrieve(sessionId)),
      spendReadingOf,
    )

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
        attemptToTell(() =>
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
        return newsOf(session, events, lastIdle)
      }),

    spend,

    /* The cap is moved from what the session says now, not from what the page last read */
    pushBudget: (sessionId, stepCents) =>
      pipe(
        spend(sessionId),
        Effect.flatMap(({ spend: spent }) => {
          if (!spent) return Effect.fail(new AgentUnavailable(NO_CAP))
          const capCents = capPushedFurther(spent, stepCents)
          return Effect.as(
            attempt(
              () =>
                sessions.update(sessionId, {
                  budget: {
                    type: 'limit',
                    max_list_cost: { amount: String(capCents), currency: 'USD' },
                  },
                }),
              PUSH_REFUSED,
            ),
            { ...spent, capCents, reached: false },
          )
        }),
      ),

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
