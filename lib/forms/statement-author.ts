import { StatementAuthorKind } from '../../domain/entities/statement'
import { NewOrganisation } from '../../domain/use-cases/create-organisation'
import { NewPublicFigure } from '../../domain/use-cases/create-public-figure'
import { StatementAuthorInput } from '../../domain/use-cases/create-statement'

/** A kind of author we do not recognise is an empty choice, which the read refuses */
const NONE: StatementAuthorInput = {
  kind: 'existing',
  author: { kind: 'public_figure', id: '' },
}

const fields = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

const text = (value: unknown): string => (typeof value === 'string' ? value : String(value ?? ''))

/** Sources: what is not a useful string is not one */
const sourcesOf = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map((source) => text(source).trim()).filter((source) => source.length > 0)
    : []

const figureOf = (value: unknown): NewPublicFigure => {
  const figure = fields(value)
  return {
    name: text(figure.name),
    presentation: text(figure.presentation),
    wikipediaUrl: text(figure.wikipediaUrl),
    websiteUrl: text(figure.websiteUrl),
    notorietySources: sourcesOf(figure.notorietySources),
  }
}

const organisationOf = (value: unknown): NewOrganisation => {
  const organisation = fields(value)
  return {
    name: text(organisation.name),
    acronym: text(organisation.acronym),
    organisationType: text(organisation.organisationType),
    presentation: text(organisation.presentation),
    wikipediaUrl: text(organisation.wikipediaUrl),
    websiteUrl: text(organisation.websiteUrl),
    notorietySources: sourcesOf(organisation.notorietySources),
  }
}

/** The author that was chosen: its kind, a personality by default, and its id */
const chosenOf = (value: unknown): StatementAuthorInput => {
  const author = fields(value)
  const kind: StatementAuthorKind =
    author.kind === 'organisation' ? 'organisation' : 'public_figure'
  return { kind: 'existing', author: { kind, id: text(author.id) } }
}

/**
 * Brings back to its expected shape what a client says is the author of a
 * statement.
 *
 * A Server Function receives JSON, not the type it declares. The command
 * switches on `kind` and reads the payload without questioning it: without
 * this pass, an unknown kind made it return `undefined` and a missing payload
 * broke on destructuring — a 500 where a refusal is due.
 *
 * What is brought back here is not judged here: the empty fields a missing
 * payload yields are refused by the domain's schemas, and an empty id by the
 * read that does not find it. The shape is guaranteed, never the substance.
 */
export function statementAuthorOf(value: unknown): StatementAuthorInput {
  if (!value || typeof value !== 'object') return NONE
  const author = value as Record<string, unknown>

  switch (author.kind) {
    case 'new_figure':
      return { kind: 'new_figure', figure: figureOf(author.figure) }
    case 'new_organisation':
      return { kind: 'new_organisation', organisation: organisationOf(author.organisation) }
    case 'existing':
      return chosenOf(author.author)
    default:
      return NONE
  }
}
