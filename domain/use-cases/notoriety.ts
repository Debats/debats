import { Effect, pipe, Schedule } from 'effect'
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
 * What the site says when it could not reach Wikipedia at all. It names the
 * way out rather than the outage: without a page, two independent sources
 * satisfy the same criterion, so nobody is stuck waiting for Wikipedia.
 */
export const UNABLE_TO_CHECK_WIKIPEDIA =
  'Impossible de vérifier cette page Wikipedia pour le moment. Réessayez, ou indiquez deux sources de notoriété à la place.'

/**
 * What the site says about a page that is not an article. Wikipedia serves
 * categories, portals and talk pages under the same `/wiki/` addresses, and
 * none of them describes a subject: the criterion asks for a page about the
 * personality or the organisation, not for any page at all.
 */
export const NOT_A_WIKIPEDIA_ARTICLE =
  'Cette adresse n’est pas un article Wikipedia (catégorie, portail, page de discussion…). Donnez l’adresse de l’article.'

/** A hiccup is caught up with once; an outage is said out loud */
const ONE_RETRY = Schedule.recurs(1).pipe(Schedule.addDelay(() => '300 millis'))

/**
 * The Wikipedia page, looked up by the validator: one that does not exist is
 * refused, one that is not an article is refused, and an article is judged by
 * the command (a biography, or not).
 *
 * Existing and being an article are asked here, for both callers, because
 * neither has anything to do with what the page describes. The judge is left
 * with the one question that differs between a personality and an
 * organisation.
 *
 * A lookup that cannot be made is none of those, and says so. Letting the URL
 * through would accept an unchecked page; calling it absent would refuse a
 * contribution over someone else's outage. The validator never guesses on our
 * behalf either — it answers or it fails — so the cases stay apart.
 */
export const wikipediaPageJudged = (
  url: string,
  judge: (page: WikipediaValidationResult) => string | null,
): Effect.Effect<void, Invalid, WikipediaValidator> =>
  pipe(
    Effect.flatMap(WikipediaValidator, (validator) =>
      Effect.tryPromise(() => validator.validatePage(url)),
    ),
    // Only the lookup is retried: a page read and judged wrong is not asked twice
    Effect.retry(ONE_RETRY),
    Effect.flatMap((page) => {
      const refused = !page.exists
        ? 'La page Wikipedia n’existe pas.'
        : !page.isArticle
          ? NOT_A_WIKIPEDIA_ARTICLE
          : judge(page)
      return refused ? Effect.fail(new Invalid({ wikipediaUrl: refused })) : Effect.void
    }),
    Effect.catchTag('UnknownException', () =>
      Effect.fail(new Invalid({ wikipediaUrl: UNABLE_TO_CHECK_WIKIPEDIA })),
    ),
  )
