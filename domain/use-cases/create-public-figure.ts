import { Effect, pipe } from 'effect'
import { generateSlug, PublicFigureId } from '../entities/public-figure'
import { addPublicFigure } from '../aggregates/public-figure'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { PublicFigureRepository } from '../repositories/public-figure-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, Grant, rewardFor } from './reward'
import { publicFigureFields, ValidatedPublicFigureFields } from './validate-public-figure-fields'
import { openStream } from './aggregate-stream'
import { allowedTo, faultsUnder, free, signedIn } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { publicFigureAggregate } from './public-figure-stream'

type CreatePublicFigureParams = {
  contributor: ContributorIdentity | null
  name: string
  presentation: string
  wikipediaUrl: string
  websiteUrl: string
  notorietySources: string[]
}

/**
 * What a form sends to open a personality: the command's own input, minus who
 * is contributing. The all-in-one contribution form passes this as a typed
 * object; the dedicated page still sends a FormData, because it carries a photo.
 */
export type NewPublicFigure = Omit<CreatePublicFigureParams, 'contributor'>

export type { FieldErrors }

/** The name is unique across the site: the projection refuses it, the command says so */
export const PUBLIC_FIGURE_NAME_TAKEN = 'Une personnalité avec ce nom existe déjà.'

/** Read side: the name must be free */
const figures = Effect.serviceFunctions(PublicFigureRepository)

/** No personality of that name yet: the slug is what would collide */
const nameFree = (fields: ValidatedPublicFigureFields) =>
  Effect.flatMap(
    figures.findBySlug(generateSlug(fields.name)),
    free(PUBLIC_FIGURE_NAME_TAKEN, 'name'),
  )

/** Who may propose the figure, with a form that holds up and a name still free */
const checked = (params: CreatePublicFigureParams) =>
  pipe(
    Effect.all({
      contributor: allowedTo(
        params.contributor,
        'add_personality',
        'proposer une nouvelle personnalité',
      ),
      fields: publicFigureFields(params),
    }),
    Effect.tap(({ fields }) => nameFree(fields)),
  )

/**
 * The form of a personality opened from the all-in-one contribution form,
 * judged whole before anything is written: the right to propose one, the
 * fields, the notoriety criterion, the Wikipedia page, and a name still free.
 *
 * The faults come back under the names that form gives its inputs, because it
 * can open a subject in the same breath and both have a presentation. The
 * Wikipedia lookup is a network call, which is why it belongs here — before
 * the transaction — and never inside it.
 */
export const inlinePublicFigureChecked = (
  params: NewPublicFigure,
  contributor: ContributorIdentity | null,
) =>
  faultsUnder('figure')(
    pipe(
      allowedTo(contributor, 'add_personality', 'proposer une nouvelle personnalité'),
      Effect.andThen(publicFigureFields(params)),
      Effect.tap(nameFree),
    ),
  )

/**
 * Opens the personality's stream inside the transaction it is given. The
 * command that proposes a personality alone and the one that proposes her
 * with her first statement both come through here, so one place knows how a
 * personality comes into being.
 *
 * The reward is left to the caller, who may have others to grant in the same
 * breath: a contributor's gains go to her stream in a single append.
 */
export const recordNewPublicFigure = (
  events: EventStore,
  contributorId: string,
  params: NewPublicFigure,
  fields: ValidatedPublicFigureFields,
) => {
  // The command names the figure: the stream exists from its first event
  const id = PublicFigureId.make(crypto.randomUUID())
  return pipe(
    openStream(
      publicFigureAggregate,
      events,
      id,
      addPublicFigure({
        ...fields,
        wikipediaUrl: params.wikipediaUrl,
        websiteUrl: params.websiteUrl,
        notorietySources: params.notorietySources,
      }),
      contributorId,
    ),
    Effect.map(({ state }) => state.figure),
  )
}

/** What proposing a personality earns, for the caller to grant alongside its others */
export const publicFigureReward = (contributorId: string, figureId: string): Grant =>
  rewardFor(contributorId, 'added_personality_validated', {
    relatedEntityType: 'public_figure',
    relatedEntityId: figureId,
  })

/** The figure's own transaction, for the command that proposes her alone */
const persisted = (
  params: CreatePublicFigureParams,
  contributor: ContributorIdentity,
  fields: ValidatedPublicFigureFields,
) =>
  pipe(
    runUnitOfWork((events) =>
      pipe(
        recordNewPublicFigure(events, contributor.id, params, fields),
        Effect.tap((figure) =>
          grant(events, contributor.id, publicFigureReward(contributor.id, figure.id)),
        ),
      ),
    ),
    uniqueTakenAs('name', PUBLIC_FIGURE_NAME_TAKEN),
  )

/**
 * Validates all inputs without persisting anything; hands the fields as decoded.
 * Run this before side effects (photo upload) to fail fast.
 */
export function validateCreatePublicFigure(params: CreatePublicFigureParams) {
  return Effect.map(checked(params), ({ fields }) => fields)
}

/**
 * Records a validated public figure in the journal and rewards the contributor.
 * Run only after validation has passed and any side effects (photo upload) are done.
 */
export function persistPublicFigure(
  params: CreatePublicFigureParams,
  fields: ValidatedPublicFigureFields,
) {
  return Effect.flatMap(signedIn(params.contributor), (contributor) =>
    persisted(params, contributor, fields),
  )
}

/**
 * Validates and creates a public figure in one step.
 * Use this when there are no side effects between validation and creation.
 */
export function createPublicFigureUseCase(params: CreatePublicFigureParams) {
  return Effect.flatMap(checked(params), ({ contributor, fields }) =>
    persisted(params, contributor, fields),
  )
}
