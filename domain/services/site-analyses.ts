import { STATEMENT_TYPES, StatementType } from '../entities/statement'
import { Compatibility } from '../read-models/position-judgements'
import { StatementAuthorRef } from '../read-models/statement-author'
import { authorKey } from './author-on-subject'

/**
 * Analyses of the whole site: what the Analyses tab of a public figure or an
 * organisation says about one author (`author-analyses.ts`), read here across
 * all of them. Pure functions over every statement of the site, with the same
 * readings: two authors agree on a subject when they share a position there,
 * the leading position is the one the most authors took.
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
}

/** What one author took, subject by subject */
interface Stances {
  author: StatementAuthorRef
  /** subject id → the positions she took there */
  bySubject: Map<string, Set<string>>
}

function stancesByAuthor(statements: readonly SiteStatement[]): Map<string, Stances> {
  const byAuthor = new Map<string, Stances>()
  for (const { author, subject, positionId } of statements) {
    const key = authorKey(author)
    const stances = byAuthor.get(key) ?? { author, bySubject: new Map<string, Set<string>>() }
    stances.bySubject.set(
      subject.id,
      (stances.bySubject.get(subject.id) ?? new Set()).add(positionId),
    )
    byAuthor.set(key, stances)
  }
  return byAuthor
}

const subjectsById = (statements: readonly SiteStatement[]): Map<string, SubjectRef> =>
  new Map(statements.map(({ subject }) => [subject.id, subject]))

const isFigure = ({ author }: Stances) => author.kind === 'public_figure'

const byName = (a: StatementAuthorRef, b: StatementAuthorRef) => a.name.localeCompare(b.name, 'fr')

const shares = (mine: Set<string>, theirs: Set<string>) =>
  Array.from(mine).some((position) => theirs.has(position))

/** One of these positions goes against one of those: they were not judged compatible */
const contradicts = (mine: Set<string>, theirs: Set<string>, compatible: Compatibility) =>
  Array.from(mine).some((m) => Array.from(theirs).some((t) => !compatible(m, t)))

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
  const counts = new Map<string, { voices: number; figures: number }>()
  for (const stances of Array.from(stancesByAuthor(statements).values()).filter(isFigure)) {
    for (const familyId of Array.from(familiesOf.get(stances.author.id) ?? [])) {
      const count = counts.get(familyId) ?? { voices: 0, figures: 0 }
      counts.set(familyId, {
        voices: count.voices + stances.bySubject.size,
        figures: count.figures + 1,
      })
    }
  }
  return families
    .flatMap((family) => {
      const count = counts.get(family.id)
      return count ? [{ family, ...count }] : []
    })
    .sort((a, b) => b.voices - a.voices || a.family.position - b.family.position)
}

/* Who thinks otherwise */

/** Two public figures and how often they stand apart */
export interface OpposedPair {
  a: StatementAuthorRef
  b: StatementAuthorRef
  /** The subjects both spoke on without sharing a position, one of hers contradicting one of his */
  opposedSubjects: number
  /** The subjects both spoke on */
  commonSubjects: number
  /** A few of the subjects they stand apart on */
  examples: SubjectRef[]
}

const EXAMPLES = 3

/**
 * The pairs of public figures who stand apart on the most subjects, each
 * figure appearing once: the counterpart of the pairs that agree
 * (`read-models/figure-agreements.ts`), with the same threshold of presence.
 * Two figures who only took compatible positions on a subject are not
 * opposed there: nothing one said goes against what the other said.
 */
export function opposedPairs(
  statements: readonly SiteStatement[],
  compatible: Compatibility,
  { minSubjects, limit }: { minSubjects: number; limit: number },
): OpposedPair[] {
  const subjects = subjectsById(statements)
  const present = Array.from(stancesByAuthor(statements).values())
    .filter((stances) => isFigure(stances) && stances.bySubject.size >= minSubjects)
    .sort((x, y) => byName(x.author, y.author))

  const pairs: Array<OpposedPair & { agreedSubjects: number }> = []
  present.forEach((first, index) => {
    for (const second of present.slice(index + 1)) {
      const common = Array.from(first.bySubject.keys()).filter((id) => second.bySubject.has(id))
      const agreed = common.filter((id) =>
        shares(first.bySubject.get(id)!, second.bySubject.get(id)!),
      )
      const opposed = common.filter(
        (id) =>
          !agreed.includes(id) &&
          contradicts(first.bySubject.get(id)!, second.bySubject.get(id)!, compatible),
      )
      if (opposed.length === 0) continue
      pairs.push({
        a: first.author,
        b: second.author,
        opposedSubjects: opposed.length,
        commonSubjects: common.length,
        agreedSubjects: agreed.length,
        examples: opposed
          .map((id) => subjects.get(id)!)
          .sort((x, y) => x.title.localeCompare(y.title, 'fr'))
          .slice(0, EXAMPLES),
      })
    }
  })

  const shown: OpposedPair[] = []
  const seen = new Set<string>()
  const ranked = pairs.sort(
    (x, y) =>
      y.opposedSubjects - x.opposedSubjects ||
      x.agreedSubjects - y.agreedSubjects ||
      byName(x.a, y.a) ||
      byName(x.b, y.b),
  )
  for (const { agreedSubjects: _agreed, ...pair } of ranked) {
    if (shown.length === limit) break
    if (seen.has(pair.a.id) || seen.has(pair.b.id)) continue
    shown.push(pair)
    seen.add(pair.a.id).add(pair.b.id)
  }
  return shown
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
  /** Who most often takes the most supported position, most often first */
  withLeading: FigureStanding[]
  /** Who most often takes another, most often first */
  elsewhere: FigureStanding[]
}

/** subject id → how many distinct authors took each of its positions, and how many spoke at all */
function supportBySubject(
  authors: readonly Stances[],
): Map<string, { byPosition: Map<string, number>; authors: number }> {
  const support = new Map<string, { byPosition: Map<string, number>; authors: number }>()
  for (const { bySubject } of authors) {
    bySubject.forEach((positions, subjectId) => {
      const entry = support.get(subjectId) ?? { byPosition: new Map<string, number>(), authors: 0 }
      positions.forEach((position) =>
        entry.byPosition.set(position, (entry.byPosition.get(position) ?? 0) + 1),
      )
      entry.authors += 1
      support.set(subjectId, entry)
    })
  }
  return support
}

/**
 * Among the public figures compared on enough subjects, who most often stands
 * with the most supported position and who most often stands elsewhere. The
 * voices of organisations count in what leads; only figures are ranked, each
 * on the side she stands the most often.
 */
export function standings(
  statements: readonly SiteStatement[],
  { minSubjects, limit }: { minSubjects: number; limit: number },
): Standings {
  const authors = Array.from(stancesByAuthor(statements).values())
  const support = supportBySubject(authors)

  const ranked = authors
    .filter(isFigure)
    .map(({ author, bySubject }): FigureStanding => {
      const compared = Array.from(bySubject.entries()).filter(
        ([subjectId]) => support.get(subjectId)!.authors > 1,
      )
      const withLeading = compared.filter(([subjectId, positions]) => {
        const { byPosition } = support.get(subjectId)!
        const most = Math.max(...Array.from(byPosition.values()))
        return Array.from(positions).some((position) => byPosition.get(position) === most)
      })
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
  /** How many times a member took one of the organisation's positions on one of its subjects */
  aligned: number
  /** How many times a member only took other positions there */
  apart: number
  /** The subjects of the organisation at least one member spoke on */
  subjects: number
}

/**
 * For each organisation, whether its members follow its line: the block of an
 * organisation's Analyses tab (`memberCohesion`), summed over its subjects.
 * A member who only took positions compatible with the line is neither with
 * it nor apart: she did not say the same thing, and nothing she said goes
 * against it. `membersOf` gives the current members of each organisation. Only
 * organisations whose members spoke enough on its subjects are listed, those
 * whose members spoke the most first.
 */
export function membersCohesion(
  statements: readonly SiteStatement[],
  membersOf: ReadonlyMap<string, ReadonlySet<string>>,
  compatible: Compatibility,
  { minVoices, limit }: { minVoices: number; limit: number },
): MembersCohesion[] {
  const authors = Array.from(stancesByAuthor(statements).values())
  const figures = new Map(authors.filter(isFigure).map((stances) => [stances.author.id, stances]))

  return authors
    .filter(({ author }) => author.kind === 'organisation')
    .map(({ author, bySubject }): MembersCohesion => {
      const members = Array.from(membersOf.get(author.id) ?? []).flatMap((id) => {
        const stances = figures.get(id)
        return stances ? [stances] : []
      })
      const cohesion = { organisation: author, aligned: 0, apart: 0, subjects: 0 }
      bySubject.forEach((line, subjectId) => {
        const spoke = members.flatMap((member) => {
          const theirs = member.bySubject.get(subjectId)
          return theirs ? [theirs] : []
        })
        const aligned = spoke.filter((theirs) => shares(line, theirs)).length
        const apart = spoke.filter(
          (theirs) => !shares(line, theirs) && contradicts(line, theirs, compatible),
        ).length
        cohesion.aligned += aligned
        cohesion.apart += apart
        cohesion.subjects += aligned + apart > 0 ? 1 : 0
      })
      return cohesion
    })
    .filter(({ aligned, apart }) => aligned + apart >= minVoices)
    .sort(
      (a, b) =>
        b.aligned + b.apart - (a.aligned + a.apart) || byName(a.organisation, b.organisation),
    )
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
