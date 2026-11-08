import { Context } from 'effect'

export interface WikipediaValidationResult {
  exists: boolean
  /**
   * An article, and not a category, a portal or a talk page. Wikipedia holds
   * those under the same `/wiki/` addresses, they exist, and none of them
   * describes a subject — a category satisfied the notoriety criterion of an
   * organisation, being a page that exists and is not a person.
   */
  isArticle: boolean
  isBiography: boolean
}

export interface WikipediaValidator {
  validatePage(url: string): Promise<WikipediaValidationResult>
}

export const WikipediaValidator = Context.GenericTag<WikipediaValidator>('WikipediaValidator')
