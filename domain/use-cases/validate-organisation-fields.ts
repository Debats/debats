import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { OrganisationType, parseOrganisationType } from '../entities/organisation'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { Invalid } from './types'
import { faultless, faultsOf } from './preconditions'
import { notorietyFaults, wikipediaPageJudged } from './notoriety'

const OrganisationFieldsInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(150)),
  acronym: S.String.pipe(S.maxLength(30)),
  presentation: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  name: 'Le nom doit faire entre 2 et 150 caractères.',
  acronym: 'Le sigle ne doit pas dépasser 30 caractères.',
  presentation: 'La présentation doit faire au moins 10 caractères.',
}

const CHOOSE_A_TYPE = 'Choisissez un type d’organisation.'

export interface OrganisationFieldsToValidate {
  name: string
  acronym: string
  organisationType: string
  presentation: string
  wikipediaUrl: string
  notorietySources: string[]
  wikipediaValidator: WikipediaValidator
}

export type ValidatedOrganisationFields = { organisationType: OrganisationType }

/**
 * The form of an organisation holds up: name, acronym, presentation and type,
 * the notoriety criterion as for a public figure, then the Wikipedia page
 * itself, which must not describe a person. Hands the parsed type.
 */
export function organisationFields(
  fields: OrganisationFieldsToValidate,
): Effect.Effect<ValidatedOrganisationFields, Invalid> {
  const { name, acronym, presentation, notorietySources, wikipediaValidator } = fields
  const wikipediaUrl = fields.wikipediaUrl.trim()
  const organisationType = parseOrganisationType(fields.organisationType)
  const faults = {
    ...faultsOf(OrganisationFieldsInput, FIELD_MESSAGES)({ name, acronym, presentation }),
    ...notorietyFaults(wikipediaUrl, notorietySources),
  }
  const typeChosen: Effect.Effect<OrganisationType, Invalid> = organisationType
    ? Effect.succeed(organisationType)
    : Effect.fail(new Invalid({ ...faults, organisationType: CHOOSE_A_TYPE }))

  return pipe(
    typeChosen,
    Effect.tap(() => faultless(faults)),
    Effect.tap(() =>
      wikipediaUrl
        ? wikipediaPageJudged(wikipediaUrl, wikipediaValidator, (page) =>
            page.isBiography
              ? 'Cette page Wikipedia décrit une personne, pas une organisation.'
              : null,
          )
        : Effect.void,
    ),
    Effect.map((organisationType) => ({ organisationType })),
  )
}
