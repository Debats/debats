import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { Invalid } from './types'
import { faultless, faultsOf } from './preconditions'
import { notorietyFaults, wikipediaPageJudged } from './notoriety'

const PublicFigureFieldsInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  name: 'Le nom doit faire entre 2 et 100 caractères.',
  presentation: 'La présentation doit faire au moins 10 caractères.',
}

/**
 * The form of a public figure holds up: name and presentation, the notoriety
 * criterion, then the Wikipedia page itself, which must be a biography.
 */
export function publicFigureFields(fields: {
  name: string
  presentation: string
  wikipediaUrl: string
  notorietySources: string[]
  wikipediaValidator: WikipediaValidator
}): Effect.Effect<void, Invalid> {
  const { name, presentation, notorietySources, wikipediaValidator } = fields
  const wikipediaUrl = fields.wikipediaUrl.trim()

  return pipe(
    faultless({
      ...faultsOf(PublicFigureFieldsInput, FIELD_MESSAGES)({ name, presentation }),
      ...notorietyFaults(wikipediaUrl, notorietySources),
    }),
    Effect.andThen(
      wikipediaUrl
        ? wikipediaPageJudged(wikipediaUrl, wikipediaValidator, (page) =>
            page.isBiography ? null : 'La page Wikipedia ne correspond pas à une biographie.',
          )
        : Effect.void,
    ),
  )
}
