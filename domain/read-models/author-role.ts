import { Occupation } from '../entities/occupation'
import { StatementAuthorRef } from './statement-author'

/** What a list names under a public figure: the occupations she holds today */
export function rolesByFigure(
  held: Array<{ publicFigureId: string; occupation: Occupation }>,
): Map<string, string> {
  const names = new Map<string, string[]>()
  for (const { publicFigureId, occupation } of held) {
    names.set(publicFigureId, [...(names.get(publicFigureId) ?? []), occupation.name])
  }
  return new Map(
    Array.from(names, ([id, list]) => [
      id,
      list.sort((a, b) => a.localeCompare(b, 'fr')).join(' · '),
    ]),
  )
}

/** The role to show under an author, when the site knows one */
export const roleOf = (
  author: StatementAuthorRef,
  roles: Map<string, string>,
): string | undefined => (author.kind === 'public_figure' ? roles.get(author.id) : undefined)
