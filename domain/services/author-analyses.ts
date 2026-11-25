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
import { Compatibility } from '../read-models/position-judgements'
import { authorKey } from './author-on-subject'
import { CourseEntry, courseOf, HeldPosition, Step } from './position-course'

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

/** Her course on each subject she spoke on, in order of first appearance */
function coursesBySubject(own: StatementWithDetails[], compatible: Compatibility) {
  const bySubject = new Map<string, StatementWithDetails[]>()
  for (const entry of own) {
    bySubject.set(entry.subject.id, [...(bySubject.get(entry.subject.id) ?? []), entry])
  }
  return Array.from(bySubject.values()).map((entries) => ({
    subject: subjectRef(entries[0].subject),
    course: courseOf(
      entries.map(({ statement, position }) => ({
        position: positionRef(position),
        statedAt: statement.statedAt,
        recordedAt: statement.createdAt,
      })),
      compatible,
    ),
  }))
}

/** A subject the author spoke on, with the positions she holds there today */
interface OwnSubject {
  subject: SubjectRef
  positions: PositionRef[]
}

/**
 * Where the author stands on each of her subjects: the positions she holds
 * today. One she left for another is not hers any more, and nobody stands
 * with her for sharing it.
 */
function ownSubjects(
  own: StatementWithDetails[],
  compatible: Compatibility,
): Map<string, OwnSubject> {
  return new Map(
    coursesBySubject(own, compatible).map(({ subject, course }) => [
      subject.id,
      { subject, positions: course.held.map((held) => held.position) },
    ]),
  )
}

/** Everyone else on the author's subjects, with what they took on each */
function others(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
  compatible: Compatibility,
): OtherAuthor[] {
  const hers = ownSubjects(own, compatible)
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
  /** Subjects where they share none, and took at least one that contradicts hers */
  disagreed: number
}

export interface Company {
  /** Those who stand with her the most often, most first */
  closest: Companion[]
  /** Those who stand apart the most often, most first */
  opposed: Companion[]
}

export const COMPANY_LIMIT = 5

/**
 * Who stands with the author the most often, and who stands apart the most
 * often. Someone who only took positions compatible with hers on a subject is
 * neither with her nor apart there: they did not say the same thing, and
 * nothing they said goes against what she said.
 */
export function company(
  own: StatementWithDetails[],
  onSubjects: StatementWithAuthor[],
  self: StatementAuthor,
  compatible: Compatibility,
  limit = COMPANY_LIMIT,
): Company {
  const hers = ownSubjects(own, compatible)
  const contradicts = ({ subject, theirs }: Stance) =>
    (hers.get(subject.id)?.positions ?? []).some((mine) =>
      theirs.some((other) => !compatible(mine.id, other.id)),
    )
  const everyoneElse = others(own, onSubjects, self, compatible)
  const companions: Companion[] = everyoneElse.map(({ author, stances }) => {
    const all = Array.from(stances.values())
    return {
      author,
      agreed: all.filter((s) => s.aligned).length,
      disagreed: all.filter((s) => !s.aligned && contradicts(s)).length,
    }
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
  compatible: Compatibility,
): Standing {
  const voices = voicesBySubject(own, onSubjects, self)
  const subjects = Array.from(ownSubjects(own, compatible).values())
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

/**
 * One run of moves that follow each other: the positions she left together,
 * then each position she took, the next one making her leave the one before
 * and nothing else. A return to a former position is a step of its own.
 */
export interface PositionTrail {
  /** Each with the day she had taken it */
  left: PositionStep[]
  taken: PositionStep[]
}

export interface PositionChange {
  subject: SubjectRef
  /**
   * In time order. Two moves share a trail only when the second left what
   * the first took: once positions can be held together, she may leave one
   * for another while keeping a third, and that is no chain. A position taken
   * beside the ones it is compatible with is no move: she left nothing for it.
   */
  trails: PositionTrail[]
}

type CourseStep = Step<CourseEntry<PositionRef>>

const follows = (trail: PositionTrail | undefined, left: HeldPosition<PositionRef>[]) =>
  left.length === 1 && trail?.taken.at(-1)?.position.id === left[0].position.id

/** The trails a course makes: a move joins the trail before it when it left what that trail last took */
function trailsOf(steps: ReadonlyArray<CourseStep>): PositionTrail[] {
  return steps.reduce<PositionTrail[]>((trails, { entry, taken }) => {
    if (!taken || taken.left.length === 0) return trails
    const took = { position: entry.position, statedAt: entry.statedAt }
    const last = trails.at(-1)
    if (last && follows(last, taken.left)) {
      return [...trails.slice(0, -1), { ...last, taken: [...last.taken, took] }]
    }
    const left = taken.left.map((held) => ({ position: held.position, statedAt: held.since }))
    return [...trails, { left, taken: [took] }]
  }, [])
}

const lastMoveOf = (change: PositionChange) => change.trails.at(-1)!.taken.at(-1)!.statedAt

/** The subjects where the author left a position for another, latest move first */
export function positionChanges(
  own: StatementWithDetails[],
  compatible: Compatibility,
): PositionChange[] {
  return coursesBySubject(own, compatible)
    .map(({ subject, course }) => ({ subject, trails: trailsOf(course.steps) }))
    .filter((change) => change.trails.length > 0)
    .sort((a, b) => lastMoveOf(b).getTime() - lastMoveOf(a).getTime())
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
  compatible: Compatibility,
  members: MembershipFigure[],
): SubjectCohesion[] {
  if (members.length === 0) return []
  const memberById = new Map(members.map((m) => [m.id, m]))
  const spoken = others(own, onSubjects, self, compatible).filter(
    ({ author }) => author.kind === 'public_figure' && memberById.has(author.id),
  )
  return Array.from(ownSubjects(own, compatible).values()).map(({ subject, positions }) => {
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
  compatible: Compatibility,
  organisations: MembershipOrganisation[],
): OrganisationLine[] {
  const hers = ownSubjects(own, compatible)
  const stancesOf = new Map(
    others(own, onSubjects, self, compatible)
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
  compatible: Compatibility,
): AuthorAnalysis {
  return {
    company: company(own, onSubjects, self, compatible),
    standing: standing(own, onSubjects, self, compatible),
    changes: positionChanges(own, compatible),
    profile: expressionProfile(own),
  }
}
