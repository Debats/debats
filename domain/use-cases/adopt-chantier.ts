import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ChantierRepository } from '../repositories/chantier-repository'
import { DraftStatementRepository } from '../repositories/draft-statement-repository'
import { allowedTo, decoded } from './preconditions'
import { ContributorIdentity, Rejected } from './types'

const AdoptChantierInput = S.Struct({
  title: S.Trim.pipe(S.minLength(3), S.maxLength(120)),
  brief: S.Trim.pipe(S.minLength(10)),
  subjects: S.Array(S.Trim.pipe(S.minLength(1))).pipe(S.minItems(1)),
})

/** What the adoption takes: the chantier's name and brief, and the subjects whose drafts it gathers */
export type AdoptChantier = S.Schema.Encoded<typeof AdoptChantierInput>

type AdoptChantierParams = {
  contributor: ContributorIdentity | null
  input: AdoptChantier
}

export const NOTHING_TO_ADOPT = 'Aucun brouillon à reprendre sur ces sujets.'

const chantiers = Effect.serviceFunctions(ChantierRepository)
const drafts = Effect.serviceFunctions(DraftStatementRepository)

/**
 * A chantier made from drafts already there: the ones on the named subjects
 * that no chantier holds and no validation settled. It is titled by the
 * person, and waits, agent not launched, until someone starts it: nothing
 * runs, nothing costs, the page already ranges what it holds.
 */
export function adoptChantierUseCase(params: AdoptChantierParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'reprendre des brouillons en chantier'),
      input: decoded(AdoptChantierInput)(params.input),
    }),
    Effect.bind('adoptable', ({ input }) => drafts.findAdoptableBySubjects([...input.subjects])),
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
        Effect.map((chantier) => ({ chantier, adopted: adoptable.length })),
      ),
    ),
  )
}
