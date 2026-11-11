import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { deliveredToChantier } from './chantier-delivery'
import { chantierOpen } from './chantier-preconditions'
import { allowedTo, decoded } from './preconditions'
import { ContributorIdentity } from './types'

const TellChantierInput = S.Struct({
  text: S.Trim.pipe(S.minLength(1)),
})

type TellChantierParams = {
  contributor: ContributorIdentity | null
  chantierId: string
  text: string
}

/** A person writes to the agent of a chantier, in her own words */
export function tellChantierUseCase(params: TellChantierParams) {
  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'admin', 'écrire à un chantier'),
      input: decoded(TellChantierInput)({ text: params.text }),
      chantier: chantierOpen(params.chantierId),
    }),
    Effect.flatMap(({ contributor, input, chantier }) =>
      deliveredToChantier(chantier, 'person', input.text, contributor.id),
    ),
  )
}
