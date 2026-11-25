import { StatementAuthorKind } from '../entities/statement'
import { authorKey } from '../services/author-on-subject'

/**
 * Who and what is being spoken on: how the home page picks the subjects and
 * the public figures it opens with, and how the index of the subjects ranks
 * its most active ones. All count the positions taken lately, rather than
 * everything ever recorded: a vote or a text signed by hundreds would
 * otherwise keep the same subjects, and the same faces, first for good.
 */

/** How far back a subject, or an author, counts as speaking */
const SPOKEN_LATELY_DAYS = 30

/**
 * The day what was said lately is counted from, given when a page renders: a
 * position counts when it was taken since — the day it was stated, not the
 * day the site recorded it.
 */
export const spokenSince = (now: Date): Date =>
  new Date(now.getTime() - SPOKEN_LATELY_DAYS * 24 * 60 * 60 * 1000)

/** One statement, reduced to who spoke on which subject */
export interface SubjectVoice {
  subjectId: string
  author: { kind: StatementAuthorKind; id: string }
}

/** How many distinct values each key gathers */
function countDistinct(pairs: ReadonlyArray<readonly [string, string]>): Map<string, number> {
  const values = new Map<string, Set<string>>()
  for (const [key, value] of pairs) {
    values.set(key, (values.get(key) ?? new Set()).add(value))
  }
  return new Map(Array.from(values, ([key, distinct]) => [key, distinct.size]))
}

/** subject id → how many distinct authors these statements give a voice to */
export const voicesBySubject = (statements: readonly SubjectVoice[]): Map<string, number> =>
  countDistinct(statements.map(({ subjectId, author }) => [subjectId, authorKey(author)]))

/** public figure id → on how many distinct subjects these statements make her speak */
export const subjectsByFigure = (statements: readonly SubjectVoice[]): Map<string, number> =>
  countDistinct(
    statements
      .filter(({ author }) => author.kind === 'public_figure')
      .map(({ subjectId, author }) => [author.id, subjectId]),
  )

/** What `lately` counts for a subject or an author; nothing when it does not name it */
export const spokenLatelyOn = (lately: ReadonlyMap<string, number>, counted: { id: string }) =>
  lately.get(counted.id) ?? 0

/**
 * Orders subjects, or authors, from the one counted the highest lately. Two
 * counted alike compare equal: each list settles them its own way.
 */
export const bySpokenLately =
  (lately: ReadonlyMap<string, number>) =>
  (a: { id: string }, b: { id: string }): number =>
    spokenLatelyOn(lately, b) - spokenLatelyOn(lately, a)
