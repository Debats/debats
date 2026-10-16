import { StatementAuthor } from '../entities/statement'
import { StatementAuthorRef } from '../read-models/statement-author'
import { StatementWithAuthor, StatementWithDetails } from '../repositories/statement-repository'

/** One of the author's positions on the subject, with the statements backing it */
export interface PositionGroup {
  position: StatementWithDetails['position']
  statements: StatementWithDetails['statement'][]
}

/** Another position on the subject and who took it */
export interface OtherPositionGroup {
  title: string
  slug: string
  authors: StatementAuthorRef[]
}

export interface SubjectCompany {
  /** Everyone else who took one of the author's positions, by position id */
  alliesByPosition: Map<string, StatementAuthorRef[]>
  /** The other positions, most supported first */
  opponents: OtherPositionGroup[]
}

export const authorKey = (author: { kind: string; id: string }) => `${author.kind}-${author.id}`

/** The author's statements on a subject, grouped by position in order of first appearance */
export function groupStatementsByPosition(statements: StatementWithDetails[]): PositionGroup[] {
  const groups = new Map<string, PositionGroup>()
  for (const { statement, position } of statements) {
    const group = groups.get(position.id) ?? { position, statements: [] }
    group.statements.push(statement)
    groups.set(position.id, group)
  }
  return Array.from(groups.values())
}

/**
 * Who else took position on the subject: allies share one of the author's
 * positions, opponents took another one. The author is left out of both.
 */
export function groupSubjectCompany(
  subjectStatements: StatementWithAuthor[],
  current: StatementAuthor,
  currentPositionIds: Set<string>,
): SubjectCompany {
  const alliesMap = new Map<string, Map<string, StatementAuthorRef>>()
  const opponentsMap = new Map<
    string,
    { title: string; slug: string; authors: Map<string, StatementAuthorRef> }
  >()

  for (const { author, position } of subjectStatements) {
    if (author.kind === current.kind && author.id === current.id) continue

    if (currentPositionIds.has(position.id)) {
      if (!alliesMap.has(position.id)) alliesMap.set(position.id, new Map())
      alliesMap.get(position.id)!.set(authorKey(author), author)
    } else {
      if (!opponentsMap.has(position.id)) {
        opponentsMap.set(position.id, {
          title: position.title,
          slug: position.slug,
          authors: new Map(),
        })
      }
      opponentsMap.get(position.id)!.authors.set(authorKey(author), author)
    }
  }

  const alliesByPosition = new Map<string, StatementAuthorRef[]>()
  alliesMap.forEach((authors, positionId) => {
    alliesByPosition.set(positionId, Array.from(authors.values()))
  })

  const opponents = Array.from(opponentsMap.values())
    .map((g) => ({ title: g.title, slug: g.slug, authors: Array.from(g.authors.values()) }))
    .sort((a, b) => b.authors.length - a.authors.length)

  return { alliesByPosition, opponents }
}

/** Distinct allies across all of the author's positions */
export function countAllies(company: SubjectCompany): number {
  return new Set(
    Array.from(company.alliesByPosition.values()).flatMap((authors) => authors.map(authorKey)),
  ).size
}
