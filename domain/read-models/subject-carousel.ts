import { contentLine, quoteOf, STATEMENT_TYPE_LABELS } from '../entities/statement'
import { StatementWithAuthor } from '../repositories/statement-repository'
import { FamilyPositionMatrix, MatrixFamily } from '../services/occupation-distribution'
import { authorKey } from '../services/author-on-subject'
import { COMPARABLE_FROM } from '../services/group-alignment'
import { latestChanges } from './position-changes'
import { Compatibility } from './position-judgements'
import { StatementAuthorRef } from './statement-author'

/** One statement of the subject, as the carousel reads it */
export interface CarouselStatement {
  author: StatementAuthorRef
  position: { id: string; title: string; slug: string }
  statedAt: Date
  createdAt: Date
  /** Its own words, when it carries any: a vote and an act have none */
  quote?: string
  /** What it carries on one line, words or fact */
  line: string
  /** « Déclaration », « Programme », « Vote »… */
  typeLabel: string
  sourceName: string
}

/** A statement set as a quotation */
export interface CarouselQuote {
  quote: string
  author: StatementAuthorRef
  position: string
  statedAt: Date
  sourceName: string
  typeLabel: string
}

export interface RankingRow {
  title: string
  /** Public figures and organisations that took the position */
  count: number
  figures: number
  organisations: number
  /** Its bar against the most supported position, from 0 to 1 */
  share: number
}

export interface FamilyRow {
  name: string
  /** The (figure, position) pairs of the family */
  total: number
  /** One share per position of the slide, in its order */
  shares: number[]
}

export interface JourneyStep {
  position: string
  statedAt: Date
  line: string
  /** Whether the line is her own words, to be set between quotation marks */
  worded: boolean
  typeLabel: string
  sourceName: string
}

export interface OrganisationEntry {
  organisation: StatementAuthorRef
  statedAt: Date
  typeLabel: string
}

export type CarouselSlide =
  | {
      kind: 'cover'
      key: string
      faces: StatementAuthorRef[]
      moreAuthors: number
      figures: number
      organisations: number
      statements: number
      span: { from: number; to: number }
    }
  | { kind: 'ranking'; key: string; rows: RankingRow[]; positions: number; otherPositions: number }
  | {
      kind: 'faces'
      key: string
      position: string
      count: number
      organisations: number
      faces: StatementAuthorRef[]
      more: number
    }
  | { kind: 'quote'; key: string; quote: CarouselQuote }
  | { kind: 'face-off'; key: string; year: number; quotes: [CarouselQuote, CarouselQuote] }
  | { kind: 'families'; key: string; positions: string[]; overall: FamilyRow; rows: FamilyRow[] }
  | { kind: 'journey'; key: string; figure: StatementAuthorRef; from: JourneyStep; to: JourneyStep }
  | {
      kind: 'organisations'
      key: string
      count: number
      groups: Array<{ position: string; entries: OrganisationEntry[] }>
      more: number
    }
  | {
      kind: 'curves'
      key: string
      from: number
      to: number
      /** One line per position; a point per year from `from` to `to`, voices so far */
      lines: Array<{ title: string; points: number[] }>
    }
  | {
      kind: 'balance'
      key: string
      positions: string[]
      /** One share per position, per period */
      periods: Array<{ from: number; to: number; shares: number[] }>
    }
  | {
      kind: 'family'
      key: string
      family: string
      total: number
      leading: { position: string; count: number; faces: StatementAuthorRef[] }
      rows: Array<{ position: string; share: number; overall: number }>
    }
  | { kind: 'call'; key: string; statements: number }

export type SlideOf<K extends CarouselSlide['kind']> = Extract<CarouselSlide, { kind: K }>

/** What the families of occupations say of the subject, and who belongs to which */
export interface CarouselFamilies {
  matrix: FamilyPositionMatrix
  /** The families of each public figure, by identifier */
  byFigure: ReadonlyMap<string, ReadonlySet<string>>
}

/** How much each slide holds; past it the least supported or the oldest is left out */
export const CAROUSEL_LIMITS = {
  coverFaces: 7,
  rankingRows: 5,
  positionFaces: 9,
  quoteLength: 300,
  faceOffLength: 200,
  familyRows: 4,
  organisations: 6,
  lines: 4,
  periods: 5,
  /** Statements a period of the balance must gather at least, on average */
  periodStatements: 8,
  /** Years with statements under which a curve says nothing */
  curveYears: 4,
  sheetFaces: 2,
} as const

const L = CAROUSEL_LIMITS

const yearOf = (date: Date) => date.getUTCFullYear()
const newestFirst = (a: CarouselStatement, b: CarouselStatement) =>
  b.statedAt.getTime() - a.statedAt.getTime() || b.createdAt.getTime() - a.createdAt.getTime()

interface Camp {
  position: CarouselStatement['position']
  /** Newest first */
  statements: CarouselStatement[]
  /** Everyone who took the position, once each: public figures first, the latest to speak first */
  voices: StatementAuthorRef[]
}

/** The positions somebody took, the most supported first; ties go to the one last spoken for */
function campsOf(statements: CarouselStatement[]): Camp[] {
  const byPosition = new Map<string, CarouselStatement[]>()
  for (const statement of [...statements].sort(newestFirst)) {
    byPosition.set(statement.position.id, [
      ...(byPosition.get(statement.position.id) ?? []),
      statement,
    ])
  }
  return Array.from(byPosition.values())
    .map((own) => {
      // A map keeps the place of the first entry of a key: here, the latest statement
      const voices = Array.from(new Map(own.map((s) => [authorKey(s.author), s.author])).values())
      return {
        position: own[0].position,
        statements: own,
        voices: [
          ...voices.filter((v) => v.kind === 'public_figure'),
          ...voices.filter((v) => v.kind === 'organisation'),
        ],
      }
    })
    .sort((a, b) => b.voices.length - a.voices.length)
}

const organisationsIn = (voices: StatementAuthorRef[]) =>
  voices.filter((v) => v.kind === 'organisation').length

/** A few faces of every camp in turn, nobody twice */
function coverFaces(camps: Camp[]): StatementAuthorRef[] {
  const faces = new Map<string, StatementAuthorRef>()
  const deepest = Math.max(0, ...camps.map((camp) => camp.voices.length))
  for (let rank = 0; rank < deepest && faces.size < L.coverFaces; rank++) {
    for (const camp of camps) {
      const voice = camp.voices[rank]
      if (voice?.kind === 'public_figure' && faces.size < L.coverFaces) {
        faces.set(authorKey(voice), voice)
      }
    }
  }
  return Array.from(faces.values())
}

function cover(statements: CarouselStatement[], camps: Camp[]): SlideOf<'cover'> {
  const authors = new Map(statements.map((s) => [authorKey(s.author), s.author]))
  const organisations = organisationsIn(Array.from(authors.values()))
  const faces = coverFaces(camps)
  const years = statements.map((s) => yearOf(s.statedAt))
  return {
    kind: 'cover',
    key: 'couverture',
    faces,
    moreAuthors: authors.size - faces.length,
    figures: authors.size - organisations,
    organisations,
    statements: statements.length,
    span: { from: Math.min(...years), to: Math.max(...years) },
  }
}

function ranking(camps: Camp[]): SlideOf<'ranking'> {
  const most = camps[0].voices.length
  const rows = camps.slice(0, L.rankingRows).map(({ position, voices }) => ({
    title: position.title,
    count: voices.length,
    figures: voices.length - organisationsIn(voices),
    organisations: organisationsIn(voices),
    share: voices.length / most,
  }))
  return {
    kind: 'ranking',
    key: 'classement',
    rows,
    positions: camps.length,
    otherPositions: camps.length - rows.length,
  }
}

function faces({ position, voices }: Camp): SlideOf<'faces'> {
  // The last place of the grid is a face when everyone holds in it, a count otherwise
  const shown = voices.length > L.positionFaces ? L.positionFaces - 1 : voices.length
  return {
    kind: 'faces',
    key: `visages-${position.slug}`,
    position: position.title,
    count: voices.length,
    organisations: organisationsIn(voices),
    faces: voices.slice(0, shown),
    more: voices.length - shown,
  }
}

const quoted = (statement: CarouselStatement, quote: string): CarouselQuote => ({
  quote,
  author: statement.author,
  position: statement.position.title,
  statedAt: statement.statedAt,
  sourceName: statement.sourceName,
  typeLabel: statement.typeLabel,
})

/** The statements of a camp whose own words hold in so many characters, newest first */
const quotable = (camp: Camp, length: number): CarouselQuote[] =>
  camp.statements.flatMap((statement) =>
    statement.quote !== undefined && statement.quote.length <= length
      ? [quoted(statement, statement.quote)]
      : [],
  )

/** The latest words of the most supported position */
function quote(camps: Camp[]): SlideOf<'quote'> | null {
  const latest = quotable(camps[0], L.quoteLength)[0]
  return latest ? { kind: 'quote', key: 'citation', quote: latest } : null
}

/**
 * The two most supported positions, each in the words of one of its own, said
 * the same year by two different authors: the latest year that offers both.
 */
function faceOff(camps: Camp[]): SlideOf<'face-off'> | null {
  if (camps.length < 2) return null
  const [first, second] = [quotable(camps[0], L.faceOffLength), quotable(camps[1], L.faceOffLength)]
  for (const one of first) {
    const year = yearOf(one.statedAt)
    const other = second.find(
      (q) => yearOf(q.statedAt) === year && authorKey(q.author) !== authorKey(one.author),
    )
    if (other) return { kind: 'face-off', key: 'face-a-face', year, quotes: [one, other] }
  }
  return null
}

const familyRow = (family: MatrixFamily): FamilyRow => ({
  name: family.family.name,
  total: family.total,
  shares: family.cells.map((cell) => cell.share),
})

/** How the largest families split across the positions, against everyone */
function families({ matrix }: CarouselFamilies): SlideOf<'families'> | null {
  const rows = matrix.families
    .filter((family) => !family.small && family.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, L.familyRows)
  if (rows.length < 2) return null
  return {
    kind: 'families',
    key: 'metiers',
    positions: matrix.positions.map((position) => position.title),
    overall: {
      name: 'Toutes les personnalités',
      total: matrix.overall.total,
      shares: matrix.overall.cells.map((cell) => cell.share),
    },
    rows: rows.map(familyRow),
  }
}

/** The latest public figure who left a position of the subject for one it contradicts */
function journey(
  statements: CarouselStatement[],
  compatible: Compatibility,
): SlideOf<'journey'> | null {
  const ofFigures = statements.filter((s) => s.author.kind === 'public_figure')
  // The search for changes reads across subjects; every statement here is of the same one
  const subject = { id: '', title: '', slug: '' }
  const [change] = latestChanges(
    ofFigures.map((s) => ({
      figure: s.author,
      subject,
      position: s.position,
      statedAt: s.statedAt,
      createdAt: s.createdAt,
    })),
    1,
    compatible,
  )
  if (!change) return null

  const step = (side: { title: string; statedAt: Date }): JourneyStep | null => {
    const said = ofFigures.find(
      (s) =>
        s.author.id === change.figure.id &&
        s.position.title === side.title &&
        s.statedAt.getTime() === side.statedAt.getTime(),
    )
    return said
      ? {
          position: said.position.title,
          statedAt: said.statedAt,
          line: said.line,
          worded: said.quote !== undefined,
          typeLabel: said.typeLabel,
          sourceName: said.sourceName,
        }
      : null
  }
  const figure = ofFigures.find((s) => s.author.id === change.figure.id)?.author
  const [from, to] = [step(change.from), step(change.to)]
  return figure && from && to ? { kind: 'journey', key: 'parcours', figure, from, to } : null
}

/** The organisations that spoke, under the position each one took */
function organisations(camps: Camp[]): SlideOf<'organisations'> | null {
  const all = camps.flatMap((camp) =>
    camp.voices
      .filter((voice) => voice.kind === 'organisation')
      .map((organisation) => {
        // Newest first: the first one found is its latest word on this position
        const latest = camp.statements.find((s) => authorKey(s.author) === authorKey(organisation))
        return { position: camp.position.title, organisation, latest }
      })
      .flatMap(({ latest, ...entry }) =>
        latest ? [{ ...entry, statedAt: latest.statedAt, typeLabel: latest.typeLabel }] : [],
      ),
  )
  // An organisation that took two positions is listed under each, and counted once
  const count = new Set(all.map((entry) => entry.organisation.id)).size
  if (count < 2) return null

  const shown = all.slice(0, L.organisations)
  const positions = Array.from(new Set(shown.map((entry) => entry.position)))
  return {
    kind: 'organisations',
    key: 'organisations',
    count,
    groups: positions.map((position) => ({
      position,
      entries: shown.filter((entry) => entry.position === position),
    })),
    more: all.length - shown.length,
  }
}

/** Voices gathered by each position, year after year: a voice counts the year it first spoke */
function curves(statements: CarouselStatement[], camps: Camp[]): SlideOf<'curves'> | null {
  const years = statements.map((s) => yearOf(s.statedAt))
  if (camps.length < 2 || new Set(years).size < L.curveYears) return null
  const [from, to] = [Math.min(...years), Math.max(...years)]

  const lines = camps.slice(0, L.lines).map((camp) => {
    const firstYear = new Map<string, number>()
    for (const statement of camp.statements) {
      // Newest first: the last one written for an author is her first year
      firstYear.set(authorKey(statement.author), yearOf(statement.statedAt))
    }
    const arrivals = Array.from(firstYear.values())
    return {
      title: camp.position.title,
      points: Array.from(
        { length: to - from + 1 },
        (_, i) => arrivals.filter((year) => year <= from + i).length,
      ),
    }
  })
  return { kind: 'curves', key: 'courbes', from, to, lines }
}

/** Consecutive years gathered into periods of about as many statements each */
function periodsOf(years: number[]): Array<{ from: number; to: number }> {
  const wanted = Math.min(L.periods, Math.floor(years.length / L.periodStatements))
  if (wanted < 3) return []
  const target = years.length / wanted
  const counts = new Map<number, number>()
  for (const year of years) counts.set(year, (counts.get(year) ?? 0) + 1)

  interface Period {
    from: number
    to: number
    count: number
  }
  const { periods, open } = Array.from(counts.entries())
    .sort((a, b) => a[0] - b[0])
    .reduce<{ periods: Period[]; open: Period | null }>(
      (gathered, [year, count]) => {
        const grown = gathered.open
          ? { ...gathered.open, to: year, count: gathered.open.count + count }
          : { from: year, to: year, count }
        return grown.count >= target
          ? { periods: [...gathered.periods, grown], open: null }
          : { periods: gathered.periods, open: grown }
      },
      { periods: [], open: null },
    )
  // What is left after the last full period is too thin to stand alone: it joins it
  const last = periods.at(-1)
  return open && last ? [...periods.slice(0, -1), { ...last, to: open.to }] : periods
}

/** The share of each position among the statements of each period */
function balance(statements: CarouselStatement[], camps: Camp[]): SlideOf<'balance'> | null {
  const periods = periodsOf(statements.map((s) => yearOf(s.statedAt)))
  if (camps.length < 2 || periods.length < 3) return null

  const kept = camps.slice(0, L.lines)
  const others = camps.length > kept.length
  return {
    kind: 'balance',
    key: 'rapport-de-force',
    positions: [
      ...kept.map((camp) => camp.position.title),
      ...(others ? ['Autres positions'] : []),
    ],
    periods: periods.map(({ from, to }) => {
      const within = statements.filter((s) => {
        const year = yearOf(s.statedAt)
        return year >= from && year <= to
      })
      const shares = kept.map(
        (camp) => within.filter((s) => s.position.id === camp.position.id).length / within.length,
      )
      const rest = 1 - shares.reduce((sum, share) => sum + share, 0)
      return { from, to, shares: others ? [...shares, Math.max(0, rest)] : shares }
    }),
  }
}

const distance = (family: MatrixFamily) =>
  family.cells.reduce((sum, cell) => sum + Math.abs(cell.deviation), 0)

/**
 * The families worth a slide of their own: the one that splits the least like
 * everyone, then the largest, among those a comparison can be read from: the
 * threshold is the one a group is compared to a subject from, everywhere on
 * the site. One slide when they are the same family.
 */
function familySheets(camps: Camp[], { matrix, byFigure }: CarouselFamilies): SlideOf<'family'>[] {
  const comparable = matrix.families.filter((family) => family.total >= COMPARABLE_FROM)
  if (comparable.length === 0) return []
  const furthest = [...comparable].sort((a, b) => distance(b) - distance(a))[0]
  const largest = [...comparable].sort((a, b) => b.total - a.total)[0]
  const chosen = furthest === largest ? [furthest] : [furthest, largest]

  return chosen.flatMap((family) => {
    // The positions folded together are not one position: a family leans to one somebody took
    const [lead] = matrix.positions
      .flatMap((position, i) => {
        const camp = camps.find((c) => c.position.id === position.id)
        return camp ? [{ camp, count: family.cells[i].count }] : []
      })
      .sort((a, b) => b.count - a.count)
    if (!lead) return []

    const members = lead.camp.voices.filter((voice) =>
      byFigure.get(voice.id)?.has(family.family.id),
    )
    return [
      {
        kind: 'family' as const,
        key: `famille-${family.family.slug}`,
        family: family.family.name,
        total: family.total,
        leading: {
          position: lead.camp.position.title,
          count: lead.count,
          faces: members.slice(0, L.sheetFaces),
        },
        rows: matrix.positions.map((p, i) => ({
          position: p.title,
          share: family.cells[i].share,
          overall: matrix.overall.cells[i].share,
        })),
      },
    ]
  })
}

const present = <T>(slide: T | null): T[] => (slide ? [slide] : [])

/**
 * The slides a subject offers to be shared, in the order they are swiped. A
 * slide the subject has nothing to say on is left out, never drawn empty; a
 * subject nobody spoke on has no carousel.
 */
export function subjectCarousel(
  statements: CarouselStatement[],
  occupations: CarouselFamilies,
  compatible: Compatibility,
): CarouselSlide[] {
  if (statements.length === 0) return []
  const camps = campsOf(statements)
  return [
    cover(statements, camps),
    ranking(camps),
    ...camps.map(faces),
    ...present(quote(camps)),
    ...present(faceOff(camps)),
    ...present(families(occupations)),
    ...present(journey(statements, compatible)),
    ...present(organisations(camps)),
    ...present(curves(statements, camps)),
    ...present(balance(statements, camps)),
    ...familySheets(camps, occupations),
    { kind: 'call', key: 'contribuer', statements: statements.length },
  ]
}

/**
 * Words without the quotation marks they were entered with. Some statements
 * were typed between « », most were not: a slide sets its own marks, once.
 */
export function unquoted(words: string): string {
  const inside = /^[«“"]\s*([\s\S]*?)\s*[»”"]$/.exec(words.trim())?.[1]
  // Marks inside are another pair: the outer ones did not hold the whole
  return inside !== undefined && !/[«»“”"]/.test(inside) ? inside : words.trim()
}

/** A statement of the repository, reduced to what the carousel reads of it */
export const toCarouselStatement = ({
  statement,
  position,
  author,
}: StatementWithAuthor): CarouselStatement => {
  const words = quoteOf(statement.content)
  const quote = words === undefined ? undefined : unquoted(words)
  return {
    author,
    position: { id: position.id, title: position.title, slug: position.slug },
    statedAt: statement.statedAt,
    createdAt: statement.createdAt,
    ...(quote === undefined ? {} : { quote }),
    line: quote ?? contentLine(statement.content),
    typeLabel: STATEMENT_TYPE_LABELS[statement.content.kind],
    sourceName: statement.sourceName,
  }
}
