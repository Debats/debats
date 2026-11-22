import { Effect, pipe } from 'effect'
import { OrganisationType } from '../entities/organisation'
import { organisationAuthor, publicFigureAuthor, StatementAuthor } from '../entities/statement'
import { EventStore } from '../events/event-store'
import { DatabaseError } from '../repositories/errors'
import { OrganisationRepository } from '../repositories/organisation-repository'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import {
  inlineOrganisationChecked,
  NewOrganisation,
  ORGANISATION_NAME_TAKEN,
  organisationReward,
  recordNewOrganisation,
} from './create-organisation'
import {
  inlinePublicFigureChecked,
  NewPublicFigure,
  PUBLIC_FIGURE_NAME_TAKEN,
  publicFigureReward,
  recordNewPublicFigure,
} from './create-public-figure'
import { found } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { ContributorIdentity, Rejected } from './types'
import { ValidatedPublicFigureFields } from './validate-public-figure-fields'

/**
 * Who speaks, for a command that makes statements — one of the author's own,
 * or the signatures of a joint declaration: read from the site, or opened in
 * the same breath. Settled before the transaction, written inside it, and
 * rewarded with the rest of what the command earns.
 */

/**
 * Who speaks: a personality or an organisation already referenced, or one the
 * form opens in the same breath. The two axes stay apart — which kind of
 * author, and existing or to open — so that `StatementAuthor`, which is the
 * domain's own notion, never carries the second.
 */
export type StatementAuthorInput =
  | { kind: 'existing'; author: StatementAuthor }
  | { kind: 'new_figure'; figure: NewPublicFigure }
  | { kind: 'new_organisation'; organisation: NewOrganisation }

/** What the preconditions settled about the author: one to open, or one read */
export type SettledAuthor =
  | {
      readonly kind: 'new_figure'
      readonly figure: NewPublicFigure
      readonly fields: ValidatedPublicFigureFields
    }
  | {
      readonly kind: 'new_organisation'
      readonly organisation: NewOrganisation
      readonly organisationType: OrganisationType
    }
  | { readonly kind: 'existing'; readonly author: StatementAuthor }

/** Read side: the author must exist */
const figures = Effect.serviceFunctions(PublicFigureRepository)
const organisations = Effect.serviceFunctions(OrganisationRepository)

/** The author must exist; the message names what was looked for */
const authorKnown = (
  author: StatementAuthor,
): Effect.Effect<
  void,
  Rejected | DatabaseError,
  PublicFigureRepository | OrganisationRepository
> =>
  author.kind === 'organisation'
    ? Effect.asVoid(
        Effect.flatMap(
          organisations.findById(author.id),
          found('L’organisation sélectionnée est introuvable.'),
        ),
      )
    : Effect.asVoid(
        Effect.flatMap(
          figures.findById(author.id),
          found('La personnalité sélectionnée est introuvable.'),
        ),
      )

/**
 * Which author the statement will carry, settled before anything is written:
 * a read from the tables, or the fields of a personality to open. Judging the
 * Wikipedia page is a network call — it happens here, and never inside the
 * transaction, whose seconds are counted.
 */
export const authorSettled = (
  author: StatementAuthorInput,
  contributor: ContributorIdentity | null,
) => {
  switch (author.kind) {
    case 'new_figure':
      return Effect.map(
        inlinePublicFigureChecked(author.figure, contributor),
        (fields): SettledAuthor => ({ kind: 'new_figure', figure: author.figure, fields }),
      )
    case 'new_organisation':
      return Effect.map(
        inlineOrganisationChecked(author.organisation, contributor),
        ({ organisationType }): SettledAuthor => ({
          kind: 'new_organisation',
          organisation: author.organisation,
          organisationType,
        }),
      )
    case 'existing':
      return Effect.map(
        authorKnown(author.author),
        (): SettledAuthor => ({ kind: 'existing', author: author.author }),
      )
  }
}

/** The author the statement carries: the one opened here, or the one read */
export const authorIn = (events: EventStore, contributorId: string, settled: SettledAuthor) => {
  switch (settled.kind) {
    case 'new_figure':
      return pipe(
        recordNewPublicFigure(events, contributorId, settled.figure, settled.fields),
        Effect.map((figure) => publicFigureAuthor(figure.id)),
        uniqueTakenAs('figureName', PUBLIC_FIGURE_NAME_TAKEN),
      )
    case 'new_organisation':
      return pipe(
        recordNewOrganisation(
          events,
          contributorId,
          settled.organisation,
          settled.organisationType,
        ),
        Effect.map((organisation) => organisationAuthor(organisation.id)),
        uniqueTakenAs('organisationName', ORGANISATION_NAME_TAKEN),
      )
    case 'existing':
      return Effect.succeed(settled.author)
  }
}

/** What opening the author earned, if one was opened at all */
export const authorRewards = (contributorId: string, settled: SettledAuthor, writtenId: string) => {
  switch (settled.kind) {
    case 'new_figure':
      return [publicFigureReward(contributorId, writtenId)]
    case 'new_organisation':
      return [organisationReward(contributorId, writtenId)]
    case 'existing':
      return []
  }
}
