import Anthropic from '@anthropic-ai/sdk'
import { JSONSchema } from 'effect'
import * as S from 'effect/Schema'
import {
  admissible,
  REVISABLE_FIELDS,
  Revision,
  RevisionRequest,
  STRUCTURAL_FIELDS,
} from '../../domain/services/draft-revision'
import { NEVER_JUDGE_THE_OPINION, SITE_WRITING_RULES } from './site-rules'
import { structuredAnswer } from './structured-answer'

const Change = S.Struct({
  field: S.Literal(...REVISABLE_FIELDS, ...STRUCTURAL_FIELDS),
  value: S.String,
})

const Answer = S.Struct({
  reply: S.String,
  advice: S.Array(
    S.Struct({
      field: S.Literal(...REVISABLE_FIELDS),
      verdict: S.Literal('ok', 'warning', 'problem'),
      note: S.String,
    }),
  ),
  changes: S.Array(Change),
  choices: S.Array(S.Struct({ label: S.String, changes: S.Array(Change) })),
  suggestions: S.Array(S.String),
})

/** The same schema both ways: what the API must answer, and what we read back */
const ANSWER_SHAPE = JSONSchema.make(Answer) as unknown as Record<string, unknown>
const decodeAnswer = S.decodeUnknownEither(Answer)

/** Stable and first, so it is cached: everything that changes comes after */
const RULES = `Tu aides un·e administrateur·ice de Débats.co, une plateforme qui cartographie les positions des personnalités publiques sur des sujets de société, à amender un brouillon de prise de position avant de le valider. Le brouillon a été produit par un agent ; la personne qui te parle décide de tout.

Tu ne décides rien et tu n'écris nulle part : tu rends des champs. La personne les voit changer dans son formulaire, peut annuler chacun, et valide quand elle veut.

${NEVER_JUDGE_THE_OPINION}

${SITE_WRITING_RULES}

On te donne un objet JSON :
- "fields" : les champs du formulaire tels qu'ils sont maintenant (nom technique, libellé, texte). C'est cela que tu relis et que tu peux réécrire.
- "locked" : les champs que la personne a modifiés à la main. Tu n'y touches pas, sauf si sa demande le vise explicitement.
- "catalogue" : ce que le site connaît déjà. "similarSubjects" sont des sujets existants au titre proche : un doublon en préparation, ou le bon endroit pour cette prise de position. "positions" sont les positions du sujet retenu. Chacun a un id.
- "source" : ce qu'a donné la lecture de la page source. "verdict.kind" vaut "verified" (la citation y est mot pour mot), "close" (une partie seulement : paraphrase ou coupe), "missing" (rien), "reachable" (page lue, mais un vote ou un acte n'a pas de citation), "unreachable" (la page n'a pas répondu), "unverifiable" (une page qu'une machine ne lit pas : PDF, réseau social, accès refusé). "excerpt" est le passage de la page autour de la citation, quand il y en a un. Ne dis JAMAIS qu'une citation est exacte si "source" est absent ou si son verdict ne le dit pas : dis ce que tu n'as pas pu voir.
- "history" : les tours précédents de la conversation.
- "request" : ce que la personne demande maintenant. Vide au premier tour : tu relis alors tout le brouillon.

Tu réponds par un objet JSON :
- "reply" : ce que tu dis à la personne, en français, en quelques phrases. Ce que tu as vu, ce que tu as changé et pourquoi, ce que tu n'as pas pu vérifier. Tutoiement interdit : vouvoie.
- "advice" : au premier tour, un avis par champ de "fields" ("ok", "warning", "problem", et une phrase qui dit quoi faire). Aux tours suivants, seulement les champs dont l'avis change.
- "changes" : les champs que tu réécris, avec leur nouveau texte complet. Seulement ce que la demande appelle, ou ce qui enfreint clairement une règle au premier tour. Jamais un champ de "locked". Jamais un champ absent de "fields".
- "choices" : quand une suite engage plus qu'un champ — rattacher le brouillon à un sujet existant ("existingSubject", valeur = son id) ou à une position existante ("existingPosition", valeur = son id) — tu la proposes ici avec un libellé court, sans l'appliquer. Vide sinon.
- "suggestions" : deux ou trois demandes que la personne pourrait faire ensuite, formulées comme elle les taperait (« Raccourcis la présentation du sujet »). Vide si rien ne s'impose.

Ne rien inventer : ni fait, ni citation, ni page. Une citation ne se réécrit jamais pour la rendre plus claire : elle se recopie, ou elle s'écarte.`

export interface DraftReviser {
  revise(request: RevisionRequest): Promise<Revision>
}

/**
 * One turn of the revision of a draft, by Claude.
 *
 * Stateless: every turn carries the form as it stands, what the site knows,
 * what the source gave, and the turns before. The answer is filtered through
 * `admissible` before anyone reads it. Nothing is kept on either side.
 */
export function createDraftReviser(): DraftReviser {
  const client = new Anthropic()

  return {
    async revise(request) {
      const message = await client.messages.create({
        model: 'claude-opus-5-5',
        max_tokens: 6000,
        /* A reading against rules, not a problem to solve, and a person is waiting */
        output_config: { effort: 'low', format: { type: 'json_schema', schema: ANSWER_SHAPE } },
        system: [{ type: 'text', text: RULES, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: JSON.stringify(request) }],
      })

      return admissible(structuredAnswer(message, decodeAnswer, 'La révision'), request)
    },
  }
}
