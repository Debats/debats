import { STATEMENT_TYPES, StatementType } from '../entities/statement'
import { FigureAgreement } from '../read-models/figure-agreements'
import { Compatibility } from '../read-models/position-judgements'
import { StatementAuthorRef } from '../read-models/statement-author'
import { authorKey } from './author-on-subject'
import { Relation, relationOf, standsOf, standsWithLeading, supportOf } from './stands'

/**
 * Analyses of the whole site: what the Analyses tab of a public figure or an
 * organisation says about one author (`author-analyses.ts`), read here across
 * all of them. Pure functions over every statement of the site, on the one
 * reading both share (`stands.ts`): an author stands where she is today, two
 * authors are with each other, apart or beside each other, and the leading
 * position is the one the most authors hold.
 */

export interface SubjectRef {
  id: string
  title: string
  slug: string
}

/** One statement, as the analyses of the site read it */
export interface SiteStatement {
  author: StatementAuthorRef
  subject: SubjectRef
  positionId: string
  type: StatementType
  /** A signature of a joint declaration, rather than words or deeds of her own */
  signed: boolean
  sourceName: string
  statedAt: Date
  /** When the site recorded it: what orders two statements of the same day */
  recordedAt: Date
}

type Held = Array<{ id: string }>

/** Where one author stands today, subject by subject */
interface Stances {
  author: StatementAuthorRef
  /** subject id → the positions she holds there */
  bySubject: Map<string, Held>
}

/** Where every author of the site stands today */
function stancesByAuthor(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
): Stances[] {
  const authors = new Map(statements.map(({ author }) => [authorKey(author), author]))
  const stands = standsOf(
    statements.map((statement) => ({
      authorKey: authorKey(statement.author),
      subjectId: statement.subject.id,
      position: { id: statement.positionId },
      statedAt: statement.statedAt,
      recordedAt: statement.recordedAt,
    })),
    compatible,
  )
  return Array.from(stands.entries()).map(([key, bySubject]) => ({
    author: authors.get(key)!,
    bySubject,
  }))
}

const subjectsById = (statements: readonly SiteStatement[]): Map<string, SubjectRef> =>
  new Map(statements.map(({ subject }) => [subject.id, subject]))

const isFigure = ({ author }: { author: StatementAuthorRef }) => author.kind === 'public_figure'

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'fr')

/* Who speaks */

/** A family of occupations, as the analyses name it */
export interface SpeakingFamily {
  id: string
  name: string
  slug: string
  position: number
}

export interface FamilySpeakers {
  family: SpeakingFamily
  /** A voice is a public figure on a subject: who spoke on three subjects is three voices */
  voices: number
  /** Distinct public figures of the family who spoke at all */
  figures: number
}

/**
 * Who speaks, by family of occupations, the most heard first. A figure of two
 * families counts in both, as everywhere occupations are counted; a figure
 * without occupation, like an organisation, counts in none.
 */
export function speakersByFamily(
  statements: readonly SiteStatement[],
  familiesOf: ReadonlyMap<string, ReadonlySet<string>>,
  families: readonly SpeakingFamily[],
): FamilySpeakers[] {
  const subjectsOf = new Map<string, Set<string>>()
  for (const { author, subject } of statements.filter(isFigure)) {
    subjectsOf.set(author.id, (subjectsOf.get(author.id) ?? new Set()).add(subject.id))
  }

  const counts = new Map<string, { voices: number; figures: number }>()
  subjectsOf.forEach((subjects, figureId) => {
    for (const familyId of Array.from(familiesOf.get(figureId) ?? [])) {
      const count = counts.get(familyId) ?? { voices: 0, figures: 0 }
      counts.set(familyId, { voices: count.voices + subjects.size, figures: count.figures + 1 })
    }
  })
  return families
    .flatMap((family) => {
      const count = counts.get(family.id)
      return count ? [{ family, ...count }] : []
    })
    .sort((a, b) => b.voices - a.voices || a.family.position - b.family.position)
}

/* Who thinks like whom, who thinks otherwise */

/** Two public figures and how often they stand apart */
export interface OpposedPair {
  a: StatementAuthorRef
  b: StatementAuthorRef
  /** The subjects both stand on, apart from each other */
  opposedSubjects: number
  /** The subjects both spoke on */
  commonSubjects: number
  /** A few of the subjects they stand apart on */
  examples: SubjectRef[]
}

const EXAMPLES = 3

/** Two figures present enough to be paired, and the subjects they have in common */
interface Paired {
  a: StatementAuthorRef
  b: StatementAuthorRef
  common: number
  /** The subjects they stand with each other on, then apart */
  agreed: SubjectRef[]
  opposed: SubjectRef[]
}

/**
 * Every two public figures who spoke on enough subjects, compared on the
 * subjects both spoke on. Two who only hold compatible positions on a subject
 * neither agree nor are opposed there.
 */
function pairsOf(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
  minSubjects: number,
): Paired[] {
  const subjects = subjectsById(statements)
  const present = stancesByAuthor(statements, compatible)
    .filter((stances) => isFigure(stances) && stances.bySubject.size >= minSubjects)
    .sort((x, y) => byName(x.author, y.author))
  const named = (ids: string[]) =>
    ids.map((id) => subjects.get(id)!).sort((x, y) => x.title.localeCompare(y.title, 'fr'))

  return present.flatMap((first, index) =>
    present.slice(index + 1).map((second): Paired => {
      const common = Array.from(first.bySubject.keys()).filter((id) => second.bySubject.has(id))
      const standing = (relation: 'with' | 'apart') =>
        common.filter(
          (id) =>
            relationOf(first.bySubject.get(id)!, second.bySubject.get(id)!, compatible) ===
            relation,
        )
      return {
        a: first.author,
        b: second.author,
        common: common.length,
        agreed: named(standing('with')),
        opposed: named(standing('apart')),
      }
    }),
  )
}

/** The first pairs of a ranking, each figure appearing once: the most present ones would fill every card */
function eachFigureOnce(ranked: readonly Paired[], limit: number): Paired[] {
  const shown: Paired[] = []
  const seen = new Set<string>()
  for (const pair of ranked) {
    if (shown.length === limit) break
    if (seen.has(pair.a.id) || seen.has(pair.b.id)) continue
    shown.push(pair)
    seen.add(pair.a.id).add(pair.b.id)
  }
  return shown
}

interface PairsOptions {
  /** Only figures who spoke on this many subjects are paired */
  minSubjects: number
  limit: number
}

/**
 * The pairs of public figures who stand with each other on the most subjects,
 * each figure appearing once. The choice is mechanical: nobody picks which
 * pair is worth showing.
 */
export function agreeingPairs(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
  { minSubjects, limit }: PairsOptions,
): FigureAgreement[] {
  const ranked = pairsOf(statements, compatible, minSubjects)
    .filter((pair) => pair.agreed.length > 0)
    .sort(
      (x, y) =>
        y.agreed.length - x.agreed.length ||
        x.common - y.common ||
        byName(x.a, y.a) ||
        byName(x.b, y.b),
    )
  return eachFigureOnce(ranked, limit).map((pair) => ({
    a: pair.a,
    b: pair.b,
    agreedSubjects: pair.agreed.length,
    commonSubjects: pair.common,
    examples: pair.agreed.slice(0, EXAMPLES),
  }))
}

/** The pairs of public figures who stand apart on the most subjects, each figure appearing once */
export function opposedPairs(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
  { minSubjects, limit }: PairsOptions,
): OpposedPair[] {
  const ranked = pairsOf(statements, compatible, minSubjects)
    .filter((pair) => pair.opposed.length > 0)
    .sort(
      (x, y) =>
        y.opposed.length - x.opposed.length ||
        x.agreed.length - y.agreed.length ||
        byName(x.a, y.a) ||
        byName(x.b, y.b),
    )
  return eachFigureOnce(ranked, limit).map((pair) => ({
    a: pair.a,
    b: pair.b,
    opposedSubjects: pair.opposed.length,
    commonSubjects: pair.common,
    examples: pair.opposed.slice(0, EXAMPLES),
  }))
}

/* Where each stands against everyone */

export interface FigureStanding {
  figure: StatementAuthorRef
  /** The subjects where one of her positions is the most supported one, or ties with it */
  withLeading: number
  /** The subjects she spoke on where somebody else spoke too */
  compared: number
}

export interface Standings {
  /** Who most often holds the most supported position, most often first */
  withLeading: FigureStanding[]
  /** Who most often holds another, most often first */
  elsewhere: FigureStanding[]
}

/**
 * Among the public figures compared on enough subjects, who most often stands
 * with the most supported position and who most often stands elsewhere. The
 * voices of organisations count in what leads; only figures are ranked, each
 * on the side she stands the most often.
 */
export function standings(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
  { minSubjects, limit }: { minSubjects: number; limit: number },
): Standings {
  const authors = stancesByAuthor(statements, compatible)
  const support = supportOf(
    new Map(authors.map(({ author, bySubject }) => [authorKey(author), bySubject])),
  )

  const ranked = authors
    .filter(isFigure)
    .map(({ author, bySubject }): FigureStanding => {
      const compared = Array.from(bySubject.entries()).filter(
        ([subjectId]) => support.get(subjectId)!.authors > 1,
      )
      const withLeading = compared.filter(([subjectId, positions]) =>
        standsWithLeading(positions, support.get(subjectId)!),
      )
      return { figure: author, withLeading: withLeading.length, compared: compared.length }
    })
    .filter(({ compared }) => compared >= minSubjects)

  const share = (standing: FigureStanding) => standing.withLeading / standing.compared
  const fromMostWith = (a: FigureStanding, b: FigureStanding) =>
    share(b) - share(a) || b.compared - a.compared || byName(a.figure, b.figure)
  const fromMostElsewhere = (a: FigureStanding, b: FigureStanding) =>
    share(a) - share(b) || b.compared - a.compared || byName(a.figure, b.figure)

  // « Most often » is at least half the time: a figure stands on one side, never on both
  return {
    withLeading: ranked
      .filter((standing) => share(standing) >= 0.5)
      .sort(fromMostWith)
      .slice(0, limit),
    elsewhere: ranked
      .filter((standing) => share(standing) < 0.5)
      .sort(fromMostElsewhere)
      .slice(0, limit),
  }
}

/* Organisations and their members */

export interface MembersCohesion {
  organisation: StatementAuthorRef
  /** How many times a member holds one of the organisation's positions on one of its subjects */
  aligned: number
  /** How many times a member holds none of them there, but only positions compatible with the line */
  beside: number
  /** How many times a member holds none there, one of hers contradicting the line */
  apart: number
  /** The subjects of the organisation at least one member spoke on */
  subjects: number
}

/** How many times the members of an organisation spoke on its subjects */
const memberVoices = ({ aligned, beside, apart }: MembersCohesion): number =>
  aligned + beside + apart

/**
 * For each organisation, whether its members follow its line: the block of an
 * organisation's Analyses tab (`memberCohesion`), summed over its subjects.
 * A member who only holds positions compatible with the line stands beside
 * it: neither with it nor apart. `membersOf` gives the current members of
 * each organisation. Only organisations whose members spoke enough on its
 * subjects are listed, those whose members spoke the most first.
 */
export function membersCohesion(
  statements: readonly SiteStatement[],
  membersOf: ReadonlyMap<string, ReadonlySet<string>>,
  compatible: Compatibility,
  { minVoices, limit }: { minVoices: number; limit: number },
): MembersCohesion[] {
  const authors = stancesByAuthor(statements, compatible)
  const figures = new Map(authors.filter(isFigure).map((stances) => [stances.author.id, stances]))

  return authors
    .filter(({ author }) => author.kind === 'organisation')
    .map(({ author, bySubject }): MembersCohesion => {
      const members = Array.from(membersOf.get(author.id) ?? []).flatMap((id) => {
        const stances = figures.get(id)
        return stances ? [stances] : []
      })
      const cohesion = { organisation: author, aligned: 0, beside: 0, apart: 0, subjects: 0 }
      bySubject.forEach((line, subjectId) => {
        const relations = members.flatMap((member) => {
          const theirs = member.bySubject.get(subjectId)
          return theirs ? [relationOf(line, theirs, compatible)] : []
        })
        const standing = (relation: Relation) => relations.filter((r) => r === relation).length
        cohesion.aligned += standing('with')
        cohesion.beside += standing('beside')
        cohesion.apart += standing('apart')
        cohesion.subjects += relations.length > 0 ? 1 : 0
      })
      return cohesion
    })
    .filter((cohesion) => memberVoices(cohesion) >= minVoices)
    .sort((a, b) => memberVoices(b) - memberVoices(a) || byName(a.organisation, b.organisation))
    .slice(0, limit)
}

/* How positions are expressed */

export interface SiteExpression {
  /** Types taken at least once, most used first */
  byType: Array<{ type: StatementType; count: number }>
  /** Words and deeds of an author's own */
  own: number
  /** Signatures of joint declarations */
  signed: number
  /** The sources the most cited outside joint declarations, most cited first */
  sources: Array<{ name: string; count: number }>
}

/**
 * How the positions of the site are expressed. The sources are counted
 * outside joint declarations: a text a hundred people signed is one
 * document, not the most cited source of the site.
 */
export function siteExpression(
  statements: readonly SiteStatement[],
  sourcesLimit: number,
): SiteExpression {
  const typeCounts = new Map<StatementType, number>()
  // Sources are typed freely: « Le Monde » and « le monde » are one source, named as first met
  const sources = new Map<string, { name: string; count: number }>()
  let signed = 0
  for (const statement of statements) {
    typeCounts.set(statement.type, (typeCounts.get(statement.type) ?? 0) + 1)
    if (statement.signed) {
      signed += 1
      continue
    }
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
    own: statements.length - signed,
    signed,
    sources: Array.from(sources.values())
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'fr'))
      .slice(0, sourcesLimit),
  }
}
