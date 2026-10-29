import { Effect, pipe } from 'effect'
import { generateSlug, PublicFigure } from '../entities/public-figure'
import { editPublicFigure } from '../aggregates/public-figure'
import { runUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { publicFigureFields, ValidatedPublicFigureFields } from './validate-public-figure-fields'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found, free, signedIn } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { decideOnPublicFigure, publicFigureAggregate } from './public-figure-stream'

type UpdatePublicFigureParams = {
  contributor: ContributorIdentity | null
  figureId: string
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

export type { FieldErrors }

const NAME_TAKEN = 'Une personnalité avec ce nom existe déjà.'

/** Read side: the figure must exist and the new name must be free */
const figures = Effect.serviceFunctions(PublicFigureRepository)

/** Who may edit the figure, which figure, with a form that holds up and a new name still free */
const checked = (params: UpdatePublicFigureParams) => {
  const nameFree = (existing: PublicFigure) => {
    const newSlug = generateSlug(params.name)
    return newSlug === existing.slug
      ? Effect.void
      : Effect.flatMap(figures.findBySlug(newSlug), free(NAME_TAKEN, 'name'))
  }
  return pipe(
    allowedTo(params.contributor, 'edit_personality', 'modifier une personnalité'),
    Effect.bindTo('contributor'),
    Effect.bind('existing', () =>
      Effect.flatMap(figures.findById(params.figureId), found(publicFigureAggregate.notFound)),
    ),
    Effect.bind('fields', () => publicFigureFields(params)),
    Effect.tap(({ existing }) => nameFree(existing)),
  )
}

/** What the validation hands: the figure as it stands, and the fields as decoded */
export interface ValidatedUpdate {
  existing: PublicFigure
  fields: ValidatedPublicFigureFields
}

/** Records the edit in the figure's stream and rewards the contributor */
const persisted = (
  params: UpdatePublicFigureParams,
  contributor: ContributorIdentity,
  { existing, fields }: ValidatedUpdate,
) => {
  const edited = editPublicFigure({
    ...fields,
    wikipediaUrl: params.wikipediaUrl.trim() || undefined,
    websiteUrl: params.websiteUrl || undefined,
    notorietySources: params.notorietySources,
  })
  return pipe(
    ensureStream(publicFigureAggregate, existing.id),
    Effect.andThen(
      runUnitOfWork((events) =>
        pipe(
          decideOnPublicFigure(
            events,
            existing.id,
            contributor.id,
            () => Effect.succeed([edited]),
            params.revision,
          ),
          Effect.tap(() =>
            grant(
              events,
              contributor.id,
              rewardFor(contributor.id, 'edited_personality', {
                relatedEntityType: 'public_figure',
                relatedEntityId: existing.id,
              }),
            ),
          ),
        ),
      ),
    ),
    uniqueTakenAs('name', NAME_TAKEN),
    Effect.map(({ state }) => state.figure),
  )
}

/**
 * Validates update inputs without persisting; hands the figure as it stands
 * and the fields as decoded. Run before side effects (photo re-upload) to fail fast.
 */
export function validateUpdatePublicFigure(params: UpdatePublicFigureParams) {
  return Effect.map(
    checked(params),
    ({ existing, fields }): ValidatedUpdate => ({ existing, fields }),
  )
}

/** Records the edit in the journal and rewards the contributor. */
export function persistUpdatedPublicFigure(
  params: UpdatePublicFigureParams,
  validated: ValidatedUpdate,
) {
  return Effect.flatMap(signedIn(params.contributor), (contributor) =>
    persisted(params, contributor, validated),
  )
}

/** Validates and updates a public figure in one step. */
export function updatePublicFigureUseCase(params: UpdatePublicFigureParams) {
  return Effect.flatMap(checked(params), ({ contributor, existing, fields }) =>
    persisted(params, contributor, { existing, fields }),
  )
}
