import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Chantier, hasAgent } from '../entities/chantier'
import { DraftStatement } from '../entities/draft-statement'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { allowedTo, decoded } from './preconditions'
import { ContributorIdentity, Rejected } from './types'

const Listed = S.Array(S.Trim.pipe(S.minLength(1)))

const AdoptChantierInput = S.Struct({
  title: S.Trim.pipe(S.minLength(3), S.maxLength(120)),
  brief: S.Trim.pipe(S.minLength(10)),
  /** What a pass before this chantier left behind, kept in the thread as the agent's word */
  recap: S.optional(S.Trim.pipe(S.minLength(10))),
  /** The subjects whose unheld drafts the chantier gathers */
  subjects: S.optional(Listed),
  /** Drafts named one by one, wherever a chantier whose agent is not at work holds them */
  drafts: S.optional(Listed),
}).pipe(
  S.filter((input) => (input.subjects?.length ?? 0) > 0 || (input.drafts?.length ?? 0) > 0, {
    message: () => 'Donnez des sujets ou des brouillons à reprendre.',
  }),
)

/** What the adoption takes: the chantier's name and brief, and what it gathers, by subject or by draft */
export type AdoptChantier = S.Schema.Encoded<typeof AdoptChantierInput>

type AdoptChantierParams = {
  contributor: ContributorIdentity | null
  input: AdoptChantier
}

export const NOTHING_TO_ADOPT = 'Aucun brouillon à reprendre sur ces sujets.'
export const HELD_BY_LAUNCHED_CHANTIER =
  'Certains de ces brouillons appartiennent à un chantier dont l’agent est lancé : ils y restent.'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const drafts = Effect.serviceFunctions(DraftStatementRepository)

/** A chantier whose agent is at work, or waits in its session: its drafts stay with it */
const launched = (chantier: Chantier | null) => chantier !== null && hasAgent(chantier)

/** The drafts named by id that a validation has not settled; one under a launched chantier refuses the whole lot */
function adoptableByIds(ids: readonly string[]) {
  const holders = (held: DraftStatement[]) =>
    Effect.forEach(
      Array.from(new Set(held.flatMap((d) => (d.chantierId ? [d.chantierId] : [])))),
      (id) => chantiers.findById(id),
    )
  return pipe(
    ids.length === 0 ? Effect.succeed([]) : drafts.findByIds([...ids]),
    Effect.map((found) => found.filter((d) => d.status !== 'validated')),
    Effect.tap((held) =>
      pipe(
        holders(held),
        Effect.filterOrFail(
          (found) => !found.some(launched),
          () => new Rejected(HELD_BY_LAUNCHED_CHANTIER),
        ),
      ),
    ),
  )
}

/** The named subjects' unheld drafts and the named drafts, each once */
function adoptable(input: S.Schema.Type<typeof AdoptChantierInput>) {
  return pipe(
    Effect.all([
      drafts.findAdoptableBySubjects([...(input.subjects ?? [])]),
      adoptableByIds(input.drafts ?? []),
    ]),
    Effect.map(([bySubject, byId]) => {
      const seen = new Set<string>()
      return [...bySubject, ...byId].filter((d) => !seen.has(d.id) && seen.add(d.id))
    }),
  )
}

/**
 * A chantier made from drafts already there: the ones on the named subjects
 * that no chantier holds, and the ones named one by one, which a chantier
 * whose agent never ran may let go. Nothing a validation settled moves. The
 * chantier is titled by the person, keeps the recap of the pass before as
 * the first word of its agent, and waits, agent not launched, until someone
 * starts it: nothing runs, nothing costs, the page already ranges what it holds.
 */
export function adoptChantierUseCase(params: AdoptChantierParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'reprendre des brouillons en chantier'),
      input: decoded(AdoptChantierInput)(params.input),
    }),
    Effect.bind('adoptable', ({ input }) => adoptable(input)),
    Effect.filterOrFail(
      ({ adoptable }) => adoptable.length > 0,
      () => new Rejected(NOTHING_TO_ADOPT),
    ),
    Effect.flatMap(({ contributor, input, adoptable }) =>
      pipe(
        chantiers.create({
          brief: input.brief,
          title: input.title,
          status: 'pending',
          createdBy: contributor.id,
        }),
        Effect.tap((chantier) =>
          drafts.assignChantier(
            adoptable.map(({ id }) => id),
            chantier.id,
          ),
        ),
        Effect.tap((chantier) =>
          input.recap
            ? chantiers.addMessages(chantier.id, [
                { role: 'agent', text: input.recap, eventId: null },
              ])
            : Effect.void,
        ),
        Effect.map((chantier) => ({ chantier, adopted: adoptable.length })),
      ),
    ),
  )
}
