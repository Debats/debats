import { plural } from '../../lib/plural'
import { isoDate } from '../aggregates/iso-date'
import { JointDeclaration } from '../entities/joint-declaration'
import { subjectHref } from './hrefs'
import { StatementAuthorRef } from './statement-author'

/** What a joint declaration says on one subject, as its page shows it */
export interface TakenStance {
  subject: { id: string; title: string; slug: string; problem: string }
  position: { id: string; title: string; slug: string }
  /** The words of the text that state the position */
  quote: string
}

/** Who signed, and what the site knows them as: occupations held today, or nothing */
export interface Signatory {
  author: StatementAuthorRef
  role?: string
}

/** Everything the page of a joint declaration shows */
export interface JointDeclarationPage {
  declaration: JointDeclaration
  /** The positions the text takes, in the order they were recorded */
  stances: TakenStance[]
  /** Who signed it, in the order the signatures were recorded */
  signatories: Signatory[]
}

/** What signing a joint declaration entails, said before the signature is added */
export interface SignaturePreview {
  sourceName: string
  /** The day the text was made public, as a calendar day: every signature is dated with it */
  declaredAt: string
  stances: { subjectTitle: string; subjectHref: string; positionTitle: string }[]
}

/** The positions a signature of this text will make, with the day and the source they will bear */
export const signaturePreviewOf = (page: JointDeclarationPage): SignaturePreview => ({
  sourceName: page.declaration.sourceName,
  declaredAt: isoDate(page.declaration.declaredAt),
  stances: page.stances.map(({ subject, position }) => ({
    subjectTitle: subject.title,
    subjectHref: subjectHref(subject.slug),
    positionTitle: position.title,
  })),
})

/** A joint declaration as the index lists it */
export interface JointDeclarationSummary {
  id: string
  title: string
  slug: string
  presentation?: string
  declaredAt: Date
  subjects: { title: string; slug: string }[]
  signatories: StatementAuthorRef[]
}

/** The joint declarations of one year, newest first */
export interface JointDeclarationsYear {
  year: number
  declarations: JointDeclarationSummary[]
}

/**
 * The index, by year, from the most recent text to the oldest — the order of
 * the timeline of a subject. A text is dated by the day it was made public,
 * read in UTC as every calendar day of the site.
 */
export function declarationsByYear(
  summaries: readonly JointDeclarationSummary[],
): JointDeclarationsYear[] {
  const newestFirst = [...summaries].sort(
    (a, b) =>
      b.declaredAt.getTime() - a.declaredAt.getTime() || a.title.localeCompare(b.title, 'fr'),
  )
  const years: JointDeclarationsYear[] = []
  for (const declaration of newestFirst) {
    const year = declaration.declaredAt.getUTCFullYear()
    const last = years[years.length - 1]
    if (last?.year === year) last.declarations.push(declaration)
    else years.push({ year, declarations: [declaration] })
  }
  return years
}

/**
 * How many signed, said as who they are: « 9 signataires » when they are all
 * personalities or all organisations would hide that organisations sign too,
 * so a text signed by both names both, and one signed by organisations alone
 * says so.
 */
export function signatoriesLabel(
  signatories: readonly { kind: StatementAuthorRef['kind'] }[],
): string {
  const organisations = signatories.filter((s) => s.kind === 'organisation').length
  const figures = signatories.length - organisations
  if (signatories.length === 0) return 'Aucune signature enregistrée'
  if (organisations === 0) return counted(figures, 'signataire', 'signataires')
  if (figures === 0) return counted(organisations, 'organisation', 'organisations')
  return `${counted(figures, 'personnalité', 'personnalités')}, ${counted(organisations, 'organisation', 'organisations')}`
}

const counted = (count: number, singular: string, pluralForm: string): string =>
  `${count} ${plural(count, singular, pluralForm)}`

/** How many signatures the index holds in all, every text counted */
export const signaturesCount = (summaries: readonly JointDeclarationSummary[]): number =>
  summaries.reduce((total, summary) => total + summary.signatories.length, 0)

/** How many distinct subjects the texts of the index engage */
export const engagedSubjectsCount = (summaries: readonly JointDeclarationSummary[]): number =>
  new Set(summaries.flatMap((summary) => summary.subjects.map((subject) => subject.slug))).size
