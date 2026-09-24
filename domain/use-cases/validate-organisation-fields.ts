import { Either } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { OrganisationType, parseOrganisationType } from '../entities/organisation'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { FieldErrors } from './types'

const OrganisationFieldsInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(150)),
  acronym: S.String.pipe(S.maxLength(30)),
  presentation: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES: Record<string, string> = {
  name: 'Le nom doit faire entre 2 et 150 caractères.',
  acronym: 'Le sigle ne doit pas dépasser 30 caractères.',
  presentation: 'La présentation doit faire au moins 10 caractères.',
}

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
 * Validates the raw form fields of an organisation. Like public figures, an
 * organisation must be notable: a Wikipedia page, or two independent sources.
 * Returns the parsed type on success, the field errors otherwise.
 */
export async function validateOrganisationFields(
  fields: OrganisationFieldsToValidate,
): Promise<Either.Either<ValidatedOrganisationFields, FieldErrors>> {
  const fieldErrors: FieldErrors = {}
  const wikipediaUrl = fields.wikipediaUrl.trim()

  const decoded = S.decodeUnknownEither(OrganisationFieldsInput, { errors: 'all' })({
    name: fields.name,
    acronym: fields.acronym,
    presentation: fields.presentation,
  })
  if (Either.isLeft(decoded)) {
    for (const issue of ArrayFormatter.formatErrorSync(decoded.left)) {
      const field = issue.path.join('.')
      fieldErrors[field] = FIELD_MESSAGES[field] ?? 'Valeur invalide.'
    }
  }

  const organisationType = parseOrganisationType(fields.organisationType)
  if (!organisationType) {
    fieldErrors.organisationType = 'Choisissez un type d’organisation.'
  }

  if (wikipediaUrl) {
    if (!/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/.test(wikipediaUrl)) {
      fieldErrors.wikipediaUrl =
        'L’URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
    }
  } else if (fields.notorietySources.length < 2) {
    fieldErrors.notorietySources =
      'Sans page Wikipedia, au moins 2 sources de notoriété sont requises.'
  } else if (!fields.notorietySources.every((url) => /^https?:\/\/.+/.test(url))) {
    fieldErrors.notorietySources =
      'Les sources de notoriété doivent être des URLs valides (https://...).'
  }

  if (Object.keys(fieldErrors).length > 0 || !organisationType) {
    return Either.left(fieldErrors)
  }

  if (wikipediaUrl) {
    const wikipediaError = await checkWikipediaPage(wikipediaUrl, fields.wikipediaValidator)
    if (wikipediaError) return Either.left({ wikipediaUrl: wikipediaError })
  }

  return Either.right({ organisationType })
}

async function checkWikipediaPage(
  url: string,
  validator: WikipediaValidator,
): Promise<string | null> {
  try {
    const page = await validator.validatePage(url)
    if (!page.exists) return 'La page Wikipedia n’existe pas.'
    if (page.isBiography) {
      return 'Cette page Wikipedia décrit une personne, pas une organisation.'
    }
    return null
  } catch {
    // Mode gracieux : si le validateur échoue, on accepte l'URL quand même
    return null
  }
}
