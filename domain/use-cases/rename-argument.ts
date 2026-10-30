import { Effect, pipe } from 'effect'
import { Argument, sameArgumentTitle } from '../entities/argument'
import { renameArgument } from '../aggregates/argument'
import { runUnitOfWork } from '../events/unit-of-work'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { allowedTo, found } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { argumentAggregate, decideOnArgument } from './argument-stream'

const TITLE_TAKEN = 'Un argument porte déjà ce titre : fusionnez-les plutôt.'
const TITLE_MIN = 3
const TITLE_MAX = 255

type RenameArgumentParams = {
  contributor: ContributorIdentity | null
  argumentId: string
  title: string
  description: string
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

export type { FieldErrors }

/** Read side: the argument must exist and no other may bear the new title */
const argumentsRead = Effect.serviceFunctions(ArgumentRepository)

/** Corrects an argument's wording; its links to statements are untouched. */
export function renameArgumentUseCase(params: RenameArgumentParams) {
  const { argumentId, description, revision } = params
  const title = params.title.trim()

  // Another argument under the same title is a duplicate to merge, not to rename into
  const titleFree = (existing: Argument) =>
    Effect.filterOrFail(
      argumentsRead.findByTitle(title),
      (homonym) =>
        !homonym || homonym.id === existing.id || sameArgumentTitle(homonym.title, existing.title),
      () => new Rejected(TITLE_TAKEN, 'title'),
    )

  return pipe(
    allowedTo(params.contributor, 'edit_argument', 'modifier un argument'),
    Effect.filterOrFail(
      () => title.length >= TITLE_MIN && title.length <= TITLE_MAX,
      () =>
        new Rejected(`Le titre doit faire entre ${TITLE_MIN} et ${TITLE_MAX} caractères.`, 'title'),
    ),
    Effect.bindTo('contributor'),
    Effect.bind('existing', () =>
      Effect.flatMap(argumentsRead.findById(argumentId), found(argumentAggregate.notFound)),
    ),
    Effect.tap(({ existing }) => titleFree(existing)),
    Effect.flatMap(({ contributor, existing }) =>
      runUnitOfWork((events) =>
        decideOnArgument(
          events,
          existing.id,
          contributor.id,
          renameArgument({ title, description }),
          revision,
        ),
      ),
    ),
    uniqueTakenAs('title', TITLE_TAKEN),
    Effect.map(({ state }) => state.argument),
  )
}
