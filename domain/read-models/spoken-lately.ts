/**
 * The subjects being spoken on: how the home page picks the subjects it opens
 * with, and how the index of the subjects ranks its most active ones. Both
 * count the voices of the positions taken lately, rather than every voice
 * ever recorded: a vote or a text signed by hundreds would otherwise keep the
 * same subjects first for good.
 */

/** How far back a subject counts as being spoken on */
const SPOKEN_LATELY_DAYS = 30

/**
 * The day the voices of late are counted from, given when a page renders: a
 * position counts when it was taken since — the day it was stated, not the
 * day the site recorded it.
 */
export const spokenSince = (now: Date): Date =>
  new Date(now.getTime() - SPOKEN_LATELY_DAYS * 24 * 60 * 60 * 1000)

/** One statement, reduced to who spoke on which subject */
export interface SubjectVoice {
  subjectId: string
  /** `authorKey` of who spoke */
  authorKey: string
}

/** subject id → how many distinct authors these statements give a voice to */
export function voicesBySubject(statements: readonly SubjectVoice[]): Map<string, number> {
  const authors = new Map<string, Set<string>>()
  for (const { subjectId, authorKey } of statements) {
    authors.set(subjectId, (authors.get(subjectId) ?? new Set()).add(authorKey))
  }
  return new Map(Array.from(authors, ([subjectId, voices]) => [subjectId, voices.size]))
}

/** How many voices spoke lately on a subject; none when `lately` does not name it */
export const spokenLatelyOn = (lately: ReadonlyMap<string, number>, subject: { id: string }) =>
  lately.get(subject.id) ?? 0

/**
 * Orders subjects from the one the most voices spoke on lately. Two subjects
 * as spoken on compare equal: each list settles them its own way.
 */
export const bySpokenLately =
  (lately: ReadonlyMap<string, number>) =>
  (a: { id: string }, b: { id: string }): number =>
    spokenLatelyOn(lately, b) - spokenLatelyOn(lately, a)
