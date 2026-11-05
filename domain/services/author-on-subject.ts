import { StatementAuthor } from '../entities/statement'
import { NeighbourSubject } from '../read-models/author-subject-page'
import { StatementAuthorRef } from '../read-models/statement-author'
import { StatementWithAuthor, StatementWithDetails } from '../repositories/statement-repository'

/** A statement and the arguments it mobilises */
export type StatementWithArguments = Pick<StatementWithDetails, 'statement' | 'arguments'>

/** One of the author's positions on the subject, with the statements backing it */
export interface PositionGroup {
  position: StatementWithDetails['position']
  statements: StatementWithArguments[]
}

export interface SubjectCompany {
  /** Everyone else who took one of the author's positions, by position id */
  alliesByPosition: Map<string, StatementAuthorRef[]>
}

export const authorKey = (author: { kind: string; id: string }) => `${author.kind}-${author.id}`

/** The author's statements on a subject, grouped by position in order of first appearance */
export function groupStatementsByPosition(statements: StatementWithDetails[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()
  for (const { statement, position, arguments: used } of statements) {
    const group = groups.get(position.id) ?? { position, statements: [] }
    group.statements.push({ statement, arguments: used })
    groups.set(position.id, group)
  }
  return Array.from(groups.values())
}

/** Combien de prises de position l'auteur a sur le sujet, toutes positions confondues */
export const countStatements = (positions: readonly PositionGroup[]): number =>
  positions.reduce((sum, group) => sum + group.statements.length, 0)

/**
 * La date de la prise de position la plus récente de l'auteur sur le sujet,
 * `null` quand il ne s'est pas exprimé. Le groupement par position ne dit
 * rien de la chronologie : c'est la plus récente de toutes les positions.
 */
export const latestStatedAt = (positions: readonly PositionGroup[]): Date | null =>
  positions
    .flatMap(({ statements }) => statements.map(({ statement }) => statement.statedAt))
    .reduce<Date | null>((last, date) => (!last || date > last ? date : last), null)

/**
 * Qui rejoint l'auteur sur chacune de ses positions, lui-même exclu. Les
 * autres positions du sujet sont le travail de `debateOnSubject`, qui les
 * montre toutes — y compris celles que personne n'a encore défendues.
 */
export function groupSubjectCompany(
  subjectStatements: StatementWithAuthor[],
  current: StatementAuthor,
  currentPositionIds: ReadonlySet<string>,
): SubjectCompany {
  const alliesMap = new Map<string, Map<string, StatementAuthorRef>>()

  for (const { author, position } of subjectStatements) {
    if (author.kind === current.kind && author.id === current.id) continue
    if (!currentPositionIds.has(position.id)) continue
    if (!alliesMap.has(position.id)) alliesMap.set(position.id, new Map())
    alliesMap.get(position.id)!.set(authorKey(author), author)
  }

  const alliesByPosition = new Map<string, StatementAuthorRef[]>()
  alliesMap.forEach((authors, positionId) => {
    alliesByPosition.set(positionId, Array.from(authors.values()))
  })

  return { alliesByPosition }
}

/** Une position du sujet et qui la défend, pour la carte du débat */
export interface PositionStanding {
  position: { id: string; title: string; slug: string }
  /** Les auteurs distincts qui l'ont prise, l'auteur de la page compris */
  authors: StatementAuthorRef[]
  /** C'est une des positions de l'auteur de la page */
  hers: boolean
}

/**
 * Le débat en entier : toutes les positions ouvertes sur le sujet, de la
 * plus à la moins soutenue. Une position que personne n'a encore défendue
 * reste de la partie — son vide est une information, et une invitation.
 */
export function debateOnSubject(
  positions: ReadonlyArray<{ id: string; title: string; slug: string }>,
  statements: readonly StatementWithAuthor[],
  hers: ReadonlySet<string>,
): PositionStanding[] {
  const authors = new Map<string, Map<string, StatementAuthorRef>>()
  for (const { author, position } of statements) {
    const taken = authors.get(position.id) ?? new Map<string, StatementAuthorRef>()
    taken.set(authorKey(author), author)
    authors.set(position.id, taken)
  }
  return positions
    .map((position) => ({
      position,
      authors: Array.from(authors.get(position.id)?.values() ?? []),
      hers: hers.has(position.id),
    }))
    .sort((a, b) => b.authors.length - a.authors.length)
}

/** Combien de positions du sujet personne n'a encore défendues */
export const countUndefended = (debate: readonly PositionStanding[]): number =>
  debate.filter((standing) => standing.authors.length === 0).length

/** Les voix du sujet, réduites à ce que mesure l'alignement par groupe */
export const voicesOf = (statements: readonly StatementWithAuthor[]) =>
  statements.map(({ author, position }) => ({
    authorKey: authorKey(author),
    positionId: position.id,
  }))

/**
 * Combien de voix porte le sujet : des auteurs distincts, l'auteur de la
 * page compris. Une personnalité qui a changé d'avis compte pour une, alors
 * qu'elle pèse dans deux segments de la barre des positions — on ne somme
 * donc jamais les effectifs par position pour obtenir ce nombre.
 */
export const countSubjectVoices = (statements: readonly StatementWithAuthor[]): number =>
  new Set(statements.map(({ author }) => authorKey(author))).size

/**
 * Ce qu'une prise de position apprend sur un sujet voisin : où elle a été
 * prise, et pour quoi. Le minimum que `neighboursOf` lit — déclarer
 * `StatementWithDetails` obligerait ses tests à fabriquer une prise de
 * position entière, ou à mentir au typage.
 */
export interface StatementOnSubject {
  subject: { id: string }
  position: { title: string }
}

/** Un sujet voisin, et ce que l'auteur y défend quand il s'y est exprimé */
export function neighboursOf(
  related: ReadonlyArray<{ id: string; title: string; slug: string }>,
  own: readonly StatementOnSubject[],
): NeighbourSubject[] {
  return related.map((subject) => {
    const mine = own.filter((statement) => statement.subject.id === subject.id)
    return {
      title: subject.title,
      slug: subject.slug,
      positions: Array.from(new Set(mine.map(({ position }) => position.title))),
      statements: mine.length,
    }
  })
}
