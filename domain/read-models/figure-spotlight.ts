import { isCurrentMembership } from '../entities/organisation-membership'
import { yearOf } from '../value-objects/day'
import { FigureIndexEntry } from './figure-index'

/** What the spotlight needs of one statement of the figure */
export interface SpotlightStatement {
  statedAt: Date
  /** Her words, when the statement carries any: a vote and an act carry none */
  quote?: string
  sourceName: string
  subject: { title: string; slug: string }
  positionTitle: string
}

/**
 * One figure put forward on the index: who she is, what she last said and
 * where she last took position. Plain values only, since a Server Function
 * hands it to the browser.
 */
export interface FigureSpotlight {
  name: string
  slug: string
  presentation: string
  statementsCount: number
  subjectsCount: number
  occupations: { name: string; isCurrent: boolean; familySlug: string }[]
  organisations: { label: string; slug: string }[]
  quote: { text: string; sourceName: string; statedAt: Date } | null
  latest: { subjectTitle: string; subjectSlug: string; positionTitle: string; year: number }[]
}

/** How many subjects the spotlight lists */
const LATEST_SUBJECTS = 3

const latestFirst = (a: SpotlightStatement, b: SpotlightStatement) =>
  b.statedAt.getTime() - a.statedAt.getTime()

/** Of statements given latest first, the first on each subject: where she stands last on it */
const latestBySubject = (statements: SpotlightStatement[]): SpotlightStatement[] =>
  statements.filter(
    (statement, index) =>
      statements.findIndex((other) => other.subject.slug === statement.subject.slug) === index,
  )

export function figureSpotlight(
  entry: FigureIndexEntry,
  statements: SpotlightStatement[],
  today: Date,
): FigureSpotlight {
  const recent = [...statements].sort(latestFirst)
  const spoken = recent.find((statement) => statement.quote !== undefined)

  return {
    name: entry.name,
    slug: entry.slug,
    presentation: entry.presentation,
    statementsCount: entry.statementsCount,
    subjectsCount: entry.subjectsCount,
    occupations: [...entry.occupations]
      .sort((a, b) => Number(b.isCurrent) - Number(a.isCurrent))
      .map(({ name, isCurrent, family }) => ({ name, isCurrent, familySlug: family.slug })),
    organisations: entry.affiliations
      .filter((affiliation) => isCurrentMembership(affiliation, today))
      .map(({ organisation }) => ({
        label: organisation.acronym ?? organisation.name,
        slug: organisation.slug,
      })),
    quote: spoken?.quote
      ? { text: spoken.quote, sourceName: spoken.sourceName, statedAt: spoken.statedAt }
      : null,
    latest: latestBySubject(recent)
      .slice(0, LATEST_SUBJECTS)
      .map(({ subject, positionTitle, statedAt }) => ({
        subjectTitle: subject.title,
        subjectSlug: subject.slug,
        positionTitle,
        year: yearOf(statedAt),
      })),
  }
}
