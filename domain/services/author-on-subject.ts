import { StatementAuthor } from '../entities/statement'
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

/** Distinct allies across all of the author's positions */
export function countAllies(company: SubjectCompany): number {
  return new Set(
    Array.from(company.alliesByPosition.values()).flatMap((authors) => authors.map(authorKey)),
  ).size
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

/** Les voix du sujet, réduites à ce que mesure l'alignement par groupe */
export const voicesOf = (statements: readonly StatementWithAuthor[]) =>
  statements.map(({ author, position }) => ({
    authorKey: authorKey(author),
    positionId: position.id,
  }))
