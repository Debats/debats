import { Either } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { WikipediaValidator } from '../services/wikipedia-validator'
import { FieldErrors } from './types'

const PublicFigureFieldsInput = S.Struct({
  name: S.String.pipe(S.minLength(2), S.maxLength(100)),
  presentation: S.String.pipe(S.minLength(10)),
})

/**
 * Validates name, presentation, wikipedia URL, notoriety sources,
 * and optionally calls the wikipedia validator.
 * Returns field errors or null if valid.
 */
export async function validatePublicFigureFields(fields: {
  name: string
  presentation: string
  wikipediaUrl: string
  notorietySources: string[]
  wikipediaValidator: WikipediaValidator
}): Promise<FieldErrors | null> {
  const { name, presentation, notorietySources, wikipediaValidator } = fields
  const wikipediaUrl = fields.wikipediaUrl.trim()

  const fieldErrors: FieldErrors = {}

  const decoded = S.decodeUnknownEither(PublicFigureFieldsInput, { errors: 'all' })({
    name,
    presentation,
  })

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'name') {
        fieldErrors.name = 'Le nom doit faire entre 2 et 100 caractères.'
      } else if (field === 'presentation') {
        fieldErrors.presentation = 'La présentation doit faire au moins 10 caractères.'
      }
    }
  }

  if (wikipediaUrl) {
    if (!/^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/.test(wikipediaUrl)) {
      fieldErrors.wikipediaUrl =
        'L\u2019URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).'
    }
  } else {
    const urlPattern = /^https?:\/\/.+/
    if (notorietySources.length < 2) {
      fieldErrors.notorietySources =
        'Sans page Wikipedia, au moins 2 sources de notoriété sont requises.'
    } else if (!notorietySources.every((url) => urlPattern.test(url))) {
      fieldErrors.notorietySources =
        'Les sources de notoriété doivent être des URLs valides (https://...).'
    }
  }

  if (Object.keys(fieldErrors).length > 0) {
    return fieldErrors
  }

  if (wikipediaUrl) {
    try {
      const wikiResult = await wikipediaValidator.validatePage(wikipediaUrl)
      if (!wikiResult.exists) {
        return { wikipediaUrl: 'La page Wikipedia n\u2019existe pas.' }
      }
      if (!wikiResult.isBiography) {
        return { wikipediaUrl: 'La page Wikipedia ne correspond pas à une biographie.' }
      }
    } catch {
      // Mode gracieux : si le validateur échoue, on accepte l'URL quand même
    }
  }

  return null
}
