import Anthropic from '@anthropic-ai/sdk'
import { JSONSchema } from 'effect'
import * as S from 'effect/Schema'
import { NEVER_JUDGE_THE_OPINION, SITE_WRITING_RULES } from './site-rules'
import { structuredAnswer } from './structured-answer'

/**
 * One field of a contribution, as the form holds it. The field's own name
 * comes back with the advice, so the form knows where to put it; the label is
 * what the contributor reads above it, which is also how the rules name it.
 */
export interface FieldToRead {
  field: string
  label: string
  value: string
}

/**
 * What the contributor chose rather than typed — the subject, the position.
 * A quote is judged against it, so the model must see it; but nobody can fix
 * it from this form, so it is never judged itself, and has no field name for
 * advice to come back on.
 */
export interface ContextToRead {
  label: string
  value: string
}

/** Green, orange, red — the three things the assist is allowed to say */
export const Verdict = S.Literal('ok', 'warning', 'problem')
export type Verdict = S.Schema.Type<typeof Verdict>

const Advice = S.Struct({
  /** The field's own name, as it was given */
  field: S.String,
  verdict: Verdict,
  /** One sentence, in French, about the writing */
  note: S.String,
})

const Read = S.Struct({ advice: S.Array(Advice) })

export type FieldAdvice = S.Schema.Type<typeof Advice>

/**
 * The same schema for both directions: what the API must answer, and what we
 * read back. Effect renders it as a draft-07 document, which is what
 * `json_schema` takes; the cast only widens Effect's own root type to the
 * open record the SDK declares.
 */
const ANSWER_SHAPE = JSONSchema.make(Read) as unknown as Record<string, unknown>
const decodeRead = S.decodeUnknownEither(Read)

/**
 * The site's own writing rules, and the one thing the assist must never do.
 *
 * Stable, and first in the request, so it is cached: the fields that change
 * come after it. Measured on the real API: the whole prefix is served from
 * the cache from the second call on.
 */
const RULES = `Tu relis une contribution à Débats.co, une plateforme qui cartographie les positions des personnalités publiques sur des sujets de société.

Ton rôle est d'aider à la saisie. Tu ne décides rien : la contribution part quoi que tu dises, et c'est la communauté humaine qui modère.

${NEVER_JUDGE_THE_OPINION}

${SITE_WRITING_RULES}

Tu vois tous les champs ensemble, donc regarde aussi leur cohérence : la citation énonce-t-elle bien la position choisie ? la problématique correspond-elle au titre ?

On te donne deux listes. "context" est ce que la personne a choisi parmi l'existant (le sujet, la position) : tu t'en sers pour juger les champs, tu ne le juges jamais et tu ne rends aucun avis dessus. "fields" est ce qu'elle a écrit : c'est cela que tu relis.

Pour chaque champ de "fields", rends un avis :
- "ok" : rien à signaler.
- "warning" : quelque chose mérite un second regard, sans certitude.
- "problem" : une règle du site est clairement enfreinte.

La note fait une phrase, en français, et dit quoi faire plutôt que ce qui est mal. N'invente aucun fait. Ne commente pas un champ qu'on ne t'a pas donné.`

export interface Proofreader {
  read(
    fields: readonly FieldToRead[],
    context: readonly ContextToRead[],
  ): Promise<readonly FieldAdvice[]>
}

/**
 * A reading of a contribution, field by field, by Claude.
 *
 * One call for the whole contribution and not one per field, for a reason
 * that is not only cost: the most useful check is between fields — does the
 * quote state the position that was chosen — and a field read alone cannot
 * make it.
 *
 * Nothing is kept. The fields go out, the advice comes back, and neither is
 * stored or logged: the assist leaves no trace and dies with the form.
 */
export function createProofreader(): Proofreader {
  const client = new Anthropic()

  return {
    async read(fields, context) {
      if (fields.length === 0) return []

      const message = await client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 4000,
        /*
         * `low` is explicit because this model's default is `medium`: the task
         * is a reading against a short list of rules, not a problem to solve,
         * and a contributor is waiting. Thinking cannot be turned off on this
         * model, and asking for it to be is a 400.
         */
        output_config: { effort: 'low', format: { type: 'json_schema', schema: ANSWER_SHAPE } },
        system: [{ type: 'text', text: RULES, cache_control: { type: 'ephemeral' } }],
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              context: context.map(({ label, value }) => ({ label, value })),
              fields: fields.map(({ field, label, value }) => ({ field, label, value })),
            }),
          },
        ],
      })

      const read = structuredAnswer(message, decodeRead, 'La relecture')

      /* Advice about a field nobody asked about has nowhere to go */
      const asked = new Set(fields.map(({ field }) => field))
      return read.advice.filter(({ field }) => asked.has(field))
    },
  }
}
