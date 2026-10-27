import { Effect, Either, pipe } from 'effect'
import { Argument, sameArgumentTitle } from '../entities/argument'
import { renameArgument } from '../aggregates/argument'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ArgumentRepository } from '../repositories/argument-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { ensureStream } from './aggregate-stream'
import { allowedTo, found } from './preconditions'
import { runFormCommand, uniqueTakenAs } from './run-command'
import { argumentAggregate, ArgumentSource, decideOnArgument } from './argument-stream'

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
  runUnitOfWork: RunUnitOfWork
  argumentSource: ArgumentSource
  /** Read side: the argument must exist and no other may bear the new title */
  argumentRepo: ArgumentRepository
}

export type { FieldErrors }

/** Corrects an argument's wording; its links to statements are untouched. */
export function renameArgumentUseCase(
  params: RenameArgumentParams,
): Promise<Either.Either<Argument, string | FieldErrors>> {
  const { argumentId, description, revision, runUnitOfWork, argumentSource, argumentRepo } = params
  const title = params.title.trim()

  // Another argument under the same title is a duplicate to merge, not to rename into
  const titleFree = (existing: Argument) =>
    Effect.filterOrFail(
      argumentRepo.findByTitle(title),
      (homonym) =>
        !homonym || homonym.id === existing.id || sameArgumentTitle(homonym.title, existing.title),
      () => new Rejected(TITLE_TAKEN, 'title'),
    )

  return runFormCommand(
    pipe(
      allowedTo(params.contributor, 'edit_argument', 'modifier un argument'),
      Effect.filterOrFail(
        () => title.length >= TITLE_MIN && title.length <= TITLE_MAX,
        () =>
          new Rejected(
            `Le titre doit faire entre ${TITLE_MIN} et ${TITLE_MAX} caractères.`,
            'title',
          ),
      ),
      Effect.bindTo('contributor'),
      Effect.bind('existing', () =>
        Effect.flatMap(argumentRepo.findById(argumentId), found(argumentAggregate.notFound)),
      ),
      Effect.tap(({ existing }) => titleFree(existing)),
      Effect.tap(({ existing }) =>
        ensureStream(argumentAggregate, runUnitOfWork, existing.id, argumentSource),
      ),
      Effect.flatMap(({ contributor, existing }) =>
        runUnitOfWork((events) =>
          decideOnArgument(
            events,
            existing.id,
            contributor.id,
            () => Effect.succeed([renameArgument({ title, description })]),
            revision,
          ),
        ),
      ),
      uniqueTakenAs('title', TITLE_TAKEN),
      Effect.map(({ state }) => state.argument),
    ),
  )
}
