import { Effect, pipe } from 'effect'
import { WikipediaValidationResult, WikipediaValidator } from '../services/wikipedia-validator'
import { FieldErrors, Invalid } from './types'

const WIKIPEDIA_PAGE = /^https:\/\/(fr|en)\.wikipedia\.org\/wiki\/.+/
const URL = /^https?:\/\/.+/

/**
 * The notoriety criterion, the same for a public figure and an organisation:
 * a Wikipedia page, or two independent sources. The faults of the form, for
 * the command to gather with the others before refusing.
 */
export function notorietyFaults(wikipediaUrl: string, notorietySources: string[]): FieldErrors {
  if (wikipediaUrl) {
    return WIKIPEDIA_PAGE.test(wikipediaUrl)
      ? {}
      : {
          wikipediaUrl:
            'L’URL Wikipedia est invalide (format attendu : https://fr.wikipedia.org/wiki/...).',
        }
  }
  if (notorietySources.length < 2) {
    return {
      notorietySources: 'Sans page Wikipedia, au moins 2 sources de notoriété sont requises.',
    }
  }
  if (!notorietySources.every((url) => URL.test(url))) {
    return {
      notorietySources: 'Les sources de notoriété doivent être des URLs valides (https://...).',
    }
  }
  return {}
}

/**
 * The Wikipedia page, looked up by the validator: one that does not exist is
 * refused, one that exists is judged by the command (a biography, or not).
 * A validator that fails lets the URL through, on purpose: the site does not
 * depend on Wikipedia to accept a contribution.
 */
export const wikipediaPageJudged = (
  url: string,
  judge: (page: WikipediaValidationResult) => string | null,
): Effect.Effect<void, Invalid, WikipediaValidator> =>
  pipe(
    Effect.flatMap(WikipediaValidator, (validator) =>
      Effect.tryPromise(() => validator.validatePage(url)),
    ),
    Effect.flatMap((page) => {
      const refused = page.exists ? judge(page) : 'La page Wikipedia n’existe pas.'
      return refused ? Effect.fail(new Invalid({ wikipediaUrl: refused })) : Effect.void
    }),
    Effect.catchTag('UnknownException', () => Effect.void),
  )
