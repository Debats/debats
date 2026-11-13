import { Option } from 'effect'
import { isCurrentMembership } from '../entities/organisation-membership'
import { FIGURES_HREF } from './hrefs'
import { PublicFigureActivitySummary } from '../value-objects/public-figure-activity-summary'

/** A family of occupations as the figures index names it */
export interface FamilyRef {
  id: string
  name: string
  slug: string
  /** Where the family stands among the others */
  position: number
}

/** One occupation of a figure, held today or before */
export interface IndexedOccupation {
  name: string
  isCurrent: boolean
  family: FamilyRef
}

/** One affiliation of a figure; whether it still runs is judged on the day of the page */
export interface IndexedAffiliation {
  organisation: { name: string; acronym: string | null; slug: string }
  endedOn: Option.Option<Date>
}

/** One figure of the index: her activity, what she does, where she belongs */
export interface FigureIndexEntry extends PublicFigureActivitySummary {
  occupations: IndexedOccupation[]
  affiliations: IndexedAffiliation[]
}

/** A figure as a section shows her */
export interface FigureCard {
  id: string
  name: string
  slug: string
  /** What she does and where she belongs; empty when the site knows neither */
  role: string
  subjectsCount: number
}

/**
 * A block of the index. `total` counts everyone the block stands for;
 * `figures` are those it shows.
 */
export type FigureIndexSection =
  | { kind: 'family'; family: FamilyRef; total: number; figures: FigureCard[] }
  /** The families too small for a section of their own */
  | { kind: 'others'; families: FamilyRef[]; total: number; figures: FigureCard[] }
  /** The figures no occupation is known for */
  | { kind: 'unassigned'; total: number; figures: FigureCard[] }

export interface FigureIndexTotals {
  figures: number
  statements: number
  families: number
}

/** A figure of the ranking, measured against the first */
export interface RankedFigure extends FigureCard {
  rank: number
  statementsCount: number
  latestStatementAt: Date | null
  /** Her subjects over those of the most documented figure, between 0 and 1 */
  share: number
}

/** How many faces a section shows on the index, a family as well as the figures without an occupation */
export const FIGURES_PER_SECTION = 6

/** Below this many members, a family joins the others instead of opening a section */
export const SMALL_FAMILY = 6

/** How many figures the ranking adds each time it is asked for more */
export const RANKED_PAGE_SIZE = 30

const byDocumentation = (a: FigureIndexEntry, b: FigureIndexEntry) =>
  b.subjectsCount - a.subjectsCount ||
  b.statementsCount - a.statementsCount ||
  a.name.localeCompare(b.name, 'fr')

/** The organisations a figure belongs to on that day, as a card names them */
const organisationsOf = (entry: FigureIndexEntry, today: Date): string =>
  entry.affiliations
    .filter((affiliation) => isCurrentMembership(affiliation, today))
    .map(({ organisation }) => organisation.acronym ?? organisation.name)
    .join(', ')

/** What she holds today among these occupations; failing that, what she held, said as past */
const occupationNames = (occupations: IndexedOccupation[]): string[] => {
  const current = occupations.filter((o) => o.isCurrent)
  return current.length > 0 ? current.map((o) => o.name) : occupations.map((o) => `ex-${o.name}`)
}

const byFamily = (occupations: IndexedOccupation[]): IndexedOccupation[] =>
  [...occupations].sort((a, b) => a.family.position - b.family.position)

const roleOf = (occupations: string[], entry: FigureIndexEntry, today: Date): string =>
  [occupations.join(', '), organisationsOf(entry, today)].filter(Boolean).join(' · ')

const cardOf = (entry: FigureIndexEntry, role: string): FigureCard => ({
  id: entry.id,
  name: entry.name,
  slug: entry.slug,
  role,
  subjectsCount: entry.subjectsCount,
})

/** A figure and what she does within the families of one block */
interface Member {
  entry: FigureIndexEntry
  occupations: IndexedOccupation[]
}

const holdsNow = (member: Member) => member.occupations.some((o) => o.isCurrent)

/** Who is in function first, then the most documented */
const byStanding = (a: Member, b: Member) =>
  Number(holdsNow(b)) - Number(holdsNow(a)) || byDocumentation(a.entry, b.entry)

const membersOf = (entries: FigureIndexEntry[], families: ReadonlySet<string>): Member[] =>
  entries
    .map((entry) => ({
      entry,
      occupations: entry.occupations.filter((o) => families.has(o.family.id)),
    }))
    .filter((member) => member.occupations.length > 0)

const familiesOf = (entries: FigureIndexEntry[]): FamilyRef[] => {
  const families = new Map<string, FamilyRef>()
  for (const entry of entries) {
    for (const { family } of entry.occupations) families.set(family.id, family)
  }
  return Array.from(families.values()).sort((a, b) => a.position - b.position)
}

/**
 * The index by occupation: one section per family, the family with the most
 * members first — whoever held one of its occupations counts, today or before,
 * and two families of the same size keep the order of the families. Then the
 * families too small to stand alone, then the figures no occupation is known
 * for. Counting is the order the site imposes least: the order of the families
 * is an editorial ranking, which opened the page on the executive.
 *
 * A figure with several occupations belongs to several families, but a face
 * is shown once on the page: who appeared in an earlier section leaves her
 * place to the next, so the order of the sections also decides where a figure
 * of several families is seen. A section left with nobody to show is dropped.
 */
export function groupFiguresByFamily(
  entries: FigureIndexEntry[],
  today: Date,
): FigureIndexSection[] {
  const shown = new Set<string>()
  const show = (members: Member[], limit: number): FigureCard[] => {
    const picked = members
      .sort(byStanding)
      .filter(({ entry }) => !shown.has(entry.id))
      .slice(0, limit)
    picked.forEach(({ entry }) => shown.add(entry.id))
    return picked.map(({ entry, occupations }) =>
      cardOf(entry, roleOf(occupationNames(occupations), entry, today)),
    )
  }

  const families = familiesOf(entries)
    .map((family) => ({ family, members: membersOf(entries, new Set([family.id])) }))
    .sort((a, b) => b.members.length - a.members.length || a.family.position - b.family.position)
  const large = families.filter(({ members }) => members.length >= SMALL_FAMILY)
  const small = families.filter(({ members }) => members.length < SMALL_FAMILY)

  const sections: FigureIndexSection[] = large.map(({ family, members }) => ({
    kind: 'family',
    family,
    total: members.length,
    figures: show(members, FIGURES_PER_SECTION),
  }))

  if (small.length > 0) {
    const others = membersOf(entries, new Set(small.map(({ family }) => family.id)))
    sections.push({
      kind: 'others',
      families: small.map(({ family }) => family),
      total: others.length,
      figures: show(others, others.length),
    })
  }

  const unassigned = entries.filter((entry) => entry.occupations.length === 0)
  if (unassigned.length > 0) {
    sections.push({
      kind: 'unassigned',
      total: unassigned.length,
      figures: [...unassigned]
        .sort(byDocumentation)
        .slice(0, FIGURES_PER_SECTION)
        .map((entry) => cardOf(entry, organisationsOf(entry, today))),
    })
  }

  return sections.filter((section) => section.figures.length > 0)
}

/** The figures of the hero: how much the site covers */
export function figureIndexTotals(entries: FigureIndexEntry[]): FigureIndexTotals {
  return {
    figures: entries.length,
    statements: entries.reduce((sum, e) => sum + e.statementsCount, 0),
    families: familiesOf(entries).length,
  }
}

/**
 * The flat view of the index: every figure, the most documented first. Under
 * each, the first occupation she holds today in the order of the families, or
 * the first she held.
 */
export function figuresByDocumentation(entries: FigureIndexEntry[], today: Date): RankedFigure[] {
  const sorted = [...entries].sort(byDocumentation)
  const top = sorted[0]?.subjectsCount ?? 0
  return sorted.map((entry, index) => ({
    ...cardOf(
      entry,
      roleOf(occupationNames(byFamily(entry.occupations)).slice(0, 1), entry, today),
    ),
    rank: index + 1,
    statementsCount: entry.statementsCount,
    latestStatementAt: entry.latestStatementAt,
    share: top === 0 ? 0 : entry.subjectsCount / top,
  }))
}

/** Up to this many statements, a figure still needs documenting */
const DOCUMENTED_THRESHOLD = 1

/**
 * A few of the figures a single sourced quote would enrich. They are too many
 * to list, so the caller says where to start among them and the list goes
 * round: a start that moves with the day shows others tomorrow.
 */
export function figuresToDocument(
  entries: FigureIndexEntry[],
  start: number,
  limit: number,
): FigureIndexEntry[] {
  const bare = entries
    .filter((e) => e.statementsCount <= DOCUMENTED_THRESHOLD)
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  return Array.from(
    { length: Math.min(limit, bare.length) },
    (_, i) => bare[(start + i) % bare.length],
  )
}

/** How the index is laid out: by family of occupations, or as one ranking */
export type FigureIndexView = 'families' | 'ranking'

/** The address parameters of the index: the view, and how far the ranking is unfolded */
export const FIGURE_INDEX_VIEW_PARAM = 'vue'
export const FIGURE_INDEX_PAGES_PARAM = 'page'

const RANKING_VIEW = 'documentees'

export const parseFigureIndexView = (value: string | undefined): FigureIndexView =>
  value === RANKING_VIEW ? 'ranking' : 'families'

/** The address of a view of the index; by family is the index itself */
export function figureIndexHref(view: FigureIndexView, pages = 1): string {
  if (view === 'families') return FIGURES_HREF
  const unfolded = pages > 1 ? `&${FIGURE_INDEX_PAGES_PARAM}=${pages}` : ''
  return `${FIGURES_HREF}?${FIGURE_INDEX_VIEW_PARAM}=${RANKING_VIEW}${unfolded}`
}

/** How many pages of the ranking the address asks for: a whole number from one up */
export function parseRankedPages(value: string | undefined): number {
  const pages = Number(value)
  return Number.isInteger(pages) && pages >= 1 ? pages : 1
}
