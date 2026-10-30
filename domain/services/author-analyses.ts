import {
  STATEMENT_TYPES,
  StatementAuthor,
  StatementContent,
  StatementType,
  statementTypeOf,
} from '../entities/statement'
import { StatementAuthorRef } from '../read-models/statement-author'
import {
  MembershipFigure,
  MembershipOrganisation,
} from '../repositories/organisation-membership-repository'
import { StatementWithAuthor, StatementWithDetails } from '../repositories/statement-repository'
import { authorKey } from './author-on-subject'

/**
 * Analyses of an author (a public figure or an organisation) against the
 * others who spoke on the same subjects: pure functions over her own
 * statements and everyone's statements on her subjects.
 *
 * On a subject, another author stands with her when they share at least one
 * position, apart when they only took other ones: the same reading as the
 * allies and opponents of the author-on-subject page.
 */

export interface SubjectRef {
  id: string
  title: string
  slug: string
}

export interface PositionRef {
  id: string
  title: string
  slug: string
}

/** What another author took on one of the author's subjects */
interface Stance {
  subject: SubjectRef
  theirs: PositionRef[]
  /** They share at least one of the author's positions there */
  aligned: boolean
}

/** Another author's stances, one per subject in common */
interface OtherAuthor {
  author: StatementAuthorRef
  stances: Map<string, Stance>
}

const positionRef = (position: PositionRef): PositionRef => ({
  id: position.id,
  title: position.title,
  slug: position.slug,
})

const subjectRef = (subject: SubjectRef): SubjectRef => ({
  id: subject.id,
  title: subject.title,
  slug: subject.slug,
})

/** A subject the author spoke on, with the positions she took there */
interface OwnSubject {
  subject: SubjectRef
  positions: PositionRef[]
}

/** The author's positions by subject, in order of first appearance */
function ownSubjects(own: StatementWithDetails[]): Map<string, OwnSubject> {
  const bySubject = new Map<string, OwnSubject>()
  for (const { subject, position } of own) {
    const entry = bySubject.get(subject.id) ?? { subject: subjectRef(subject), positions: [] }
    if (!entry.positions.some((p) => p.id === position.id))
      entry.positions.push(positionRef(position))
    bySubject.set(subject.id, entry)
  }
  return bySubject
}

/** Everyone else on the author's subjects, with what they took on each */
function others(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
): OtherAuthor[] {
  const hers = ownSubjects(own)
  const selfKey = authorKey(self)
  const byAuthor = new Map<string, OtherAuthor>()
  for (const { author, position } of onSubjects) {
    const key = authorKey(author)
    if (key === selfKey) continue
    const subject = hers.get(position.subjectId)
    if (!subject) continue
    const other = byAuthor.get(key) ?? { author, stances: new Map<string, Stance>() }
    const stance = other.stances.get(position.subjectId) ?? {
      subject: subject.subject,
      theirs: [],
      aligned: false,
    }
    if (!stance.theirs.some((p) => p.id === position.id)) stance.theirs.push(positionRef(position))
    stance.aligned = stance.aligned || subject.positions.some((p) => p.id === position.id)
    other.stances.set(position.subjectId, stance)
    byAuthor.set(key, other)
  }
  return Array.from(byAuthor.values())
}

const byName = (a: { author: { name: string } }, b: { author: { name: string } }) =>
  a.author.name.localeCompare(b.author.name, 'fr')

/* Who she stands with */

export interface Companion {
  author: StatementAuthorRef
  /** Subjects where they share one of the author's positions */
  agreed: number
  /** Subjects where they only took other positions */
  disagreed: number
}

export interface Company {
  /** Those who stand with her the most often, most first */
  closest: Companion[]
  /** Those who stand apart the most often, most first */
  opposed: Companion[]
}

export const COMPANY_LIMIT = 5

/** Who stands with the author the most often, and who stands apart the most often */
export function company(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
  limit = COMPANY_LIMIT,
): Company {
  const companions: Companion[] = others(own, onSubjects, self).map(({ author, stances }) => {
    const all = Array.from(stances.values())
    const agreed = all.filter((s) => s.aligned).length
    return { author, agreed, disagreed: all.length - agreed }
  })
  return {
    closest: companions
      .filter((c) => c.agreed > 0)
      .sort((a, b) => b.agreed - a.agreed || a.disagreed - b.disagreed || byName(a, b))
      .slice(0, limit),
    opposed: companions
      .filter((c) => c.disagreed > 0)
      .sort((a, b) => b.disagreed - a.disagreed || a.agreed - b.agreed || byName(a, b))
      .slice(0, limit),
  }
}

/* Where she stands against everyone */

export interface SubjectStanding {
  subject: SubjectRef
  /** The author's positions on the subject */
  positions: PositionRef[]
  /** The position the most authors took, the author counted */
  leading: { title: string; authors: number }
  /** Distinct authors on the subject, the author counted */
  authors: number
  /** One of her positions is the leading one, or ties with it */
  withLeading: boolean
}

export interface Standing {
  /** Every subject she spoke on, the most debated first */
  subjects: SubjectStanding[]
  /** Subjects where at least one other author spoke */
  comparedCount: number
  /** Among those, where she stands with the leading position */
  withLeadingCount: number
}

/** The distinct authors behind each position of a subject */
interface Voices {
  title: string
  authors: Set<string>
}

/** Who took which position, subject by subject; the author's own statements count too */
function voicesBySubject(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
): Map<string, Map<string, Voices>> {
  const bySubject = new Map<string, Map<string, Voices>>()
  const count = (subjectId: string, position: PositionRef, key: string) => {
    const positions = bySubject.get(subjectId) ?? new Map<string, Voices>()
    const voices = positions.get(position.id) ?? { title: position.title, authors: new Set() }
    voices.authors.add(key)
    positions.set(position.id, voices)
    bySubject.set(subjectId, positions)
  }
  for (const { author, position } of onSubjects)
    count(position.subjectId, position, authorKey(author))
  for (const { subject, position } of own) count(subject.id, position, authorKey(self))
  return bySubject
}

/** On each subject, whether the author stands with the most supported position */
export function standing(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
): Standing {
  const voices = voicesBySubject(own, onSubjects, self)
  const subjects = Array.from(ownSubjects(own).values())
    .map(({ subject, positions }) => {
      const byPosition = voices.get(subject.id)!
      const onSubject = Array.from(byPosition.values())
      const most = Math.max(...onSubject.map((v) => v.authors.size))
      const leading = onSubject.find((v) => v.authors.size === most)!
      const everyone = new Set(onSubject.flatMap((v) => Array.from(v.authors)))
      return {
        subject,
        positions,
        leading: { title: leading.title, authors: most },
        authors: everyone.size,
        withLeading: positions.some((p) => byPosition.get(p.id)?.authors.size === most),
      }
    })
    .sort((a, b) => b.authors - a.authors || a.subject.title.localeCompare(b.subject.title, 'fr'))

  const compared = subjects.filter((s) => s.authors > 1)
  return {
    subjects,
    comparedCount: compared.length,
    withLeadingCount: compared.filter((s) => s.withLeading).length,
  }
}

/* When she changed her mind */

export interface PositionStep {
  position: PositionRef
  statedAt: Date
}

export interface PositionChange {
  subject: SubjectRef
  /** Each position in the order it was taken; a return to a former one is a step of its own */
  steps: PositionStep[]
}

const byStatedThenRecorded = (a: StatementWithDetails, b: StatementWithDetails) =>
  a.statement.statedAt.getTime() - b.statement.statedAt.getTime() ||
  a.statement.createdAt.getTime() - b.statement.createdAt.getTime()

/** The subjects where the author moved from one position to another, latest move first */
export function positionChanges(own: StatementWithDetails[]): PositionChange[] {
  const bySubject = new Map<string, StatementWithDetails[]>()
  for (const entry of own) {
    bySubject.set(entry.subject.id, [...(bySubject.get(entry.subject.id) ?? []), entry])
  }
  return Array.from(bySubject.values())
    .map((entries) => {
      const steps: PositionStep[] = []
      for (const { statement, position } of [...entries].sort(byStatedThenRecorded)) {
        if (steps.at(-1)?.position.id !== position.id) {
          steps.push({ position: positionRef(position), statedAt: statement.statedAt })
        }
      }
      return { subject: subjectRef(entries[0].subject), steps }
    })
    .filter((change) => change.steps.length > 1)
    .sort((a, b) => b.steps.at(-1)!.statedAt.getTime() - a.steps.at(-1)!.statedAt.getTime())
}

/* How she expresses herself */

export interface ExpressionProfile {
  /** Types taken at least once, most used first */
  byType: Array<{ type: StatementType; count: number }>
  /** The sources cited the most, most cited first */
  sources: Array<{ name: string; count: number }>
}

export const SOURCES_LIMIT = 5

/** How the author expresses herself: by type of statement, and through which sources */
export function expressionProfile(
  own: ReadonlyArray<{ statement: { content: StatementContent; sourceName: string } }>,
  limit = SOURCES_LIMIT,
): ExpressionProfile {
  const typeCounts = new Map<StatementType, number>()
  // Sources are typed freely: « Le Monde » and « le monde » are one source, named as first met
  const sources = new Map<string, { name: string; count: number }>()
  for (const { statement } of own) {
    const type = statementTypeOf(statement.content)
    typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
    const name = statement.sourceName.trim()
    const key = name.toLocaleLowerCase('fr')
    const source = sources.get(key) ?? { name, count: 0 }
    source.count += 1
    sources.set(key, source)
  }
  return {
    byType: STATEMENT_TYPES.flatMap((type) => {
      const count = typeCounts.get(type)
      return count ? [{ type, count }] : []
    }).sort((a, b) => b.count - a.count),
    sources: Array.from(sources.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'))
      .slice(0, limit),
  }
}

/* An organisation and its members */

export interface MemberApart {
  figure: MembershipFigure
  positions: PositionRef[]
}

export interface SubjectCohesion {
  subject: SubjectRef
  /** The organisation's positions on the subject */
  positions: PositionRef[]
  /** Members who share one of them */
  aligned: MembershipFigure[]
  /** Members who only took other positions */
  apart: MemberApart[]
  /** Members who did not speak on the subject */
  silent: number
}

/** On each subject the organisation spoke on, where its members stand */
export function memberCohesion(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
  members: MembershipFigure[],
): SubjectCohesion[] {
  if (members.length === 0) return []
  const memberById = new Map(members.map((m) => [m.id, m]))
  const spoken = others(own, onSubjects, self).filter(
    ({ author }) => author.kind === 'public_figure' && memberById.has(author.id),
  )
  return Array.from(ownSubjects(own).values()).map(({ subject, positions }) => {
    const aligned: MembershipFigure[] = []
    const apart: MemberApart[] = []
    for (const { author, stances } of spoken) {
      const stance = stances.get(subject.id)
      if (!stance) continue
      const figure = memberById.get(author.id)!
      if (stance.aligned) aligned.push(figure)
      else apart.push({ figure, positions: stance.theirs })
    }
    return {
      subject,
      positions,
      aligned,
      apart,
      silent: members.length - aligned.length - apart.length,
    }
  })
}

/* A public figure and the line of her organisations */

export interface SubjectAgainstOrganisation {
  subject: SubjectRef
  /** The author's positions there */
  mine: PositionRef[]
  /** The organisation's positions there */
  theirs: PositionRef[]
}

export interface OrganisationLine {
  organisation: MembershipOrganisation
  /** Subjects where she shares one of the organisation's positions */
  aligned: SubjectAgainstOrganisation[]
  /** Subjects where she only took other positions */
  apart: SubjectAgainstOrganisation[]
}

/** On the subjects both spoke on, whether the author follows the line of each of her organisations */
export function organisationsLine(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
  organisations: MembershipOrganisation[],
): OrganisationLine[] {
  const hers = ownSubjects(own)
  const stancesOf = new Map(
    others(own, onSubjects, self)
      .filter(({ author }) => author.kind === 'organisation')
      .map(({ author, stances }) => [author.id, stances]),
  )
  return organisations.flatMap((organisation) => {
    const stances = stancesOf.get(organisation.id)
    if (!stances) return []
    const line: OrganisationLine = { organisation, aligned: [], apart: [] }
    for (const stance of Array.from(stances.values())) {
      const compared = {
        subject: stance.subject,
        mine: hers.get(stance.subject.id)?.positions ?? [],
        theirs: stance.theirs,
      }
      if (stance.aligned) line.aligned.push(compared)
      else line.apart.push(compared)
    }
    return [line]
  })
}

/* The four analyses every author gets */

export interface AuthorAnalysis {
  company: Company
  standing: Standing
  changes: PositionChange[]
  profile: ExpressionProfile
}

/** Everything the Analyses tab of a public figure or an organisation shows about her alone */
export function analyseAuthor(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
): AuthorAnalysis {
  return {
    company: company(own, onSubjects, self),
    standing: standing(own, onSubjects, self),
    changes: positionChanges(own),
    profile: expressionProfile(own),
  }
}
