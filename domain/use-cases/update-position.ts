import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { Position } from '../entities/position'
import { editPosition, findPosition } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { runCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

const UpdatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

type UpdatePositionParams = {
  contributor: ContributorIdentity | null
  positionId: string
  title: string
  description: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
  /** Read side: which subject the position belongs to */
  positionRepo: PositionRepository
}

export type { FieldErrors }

export async function updatePositionUseCase(
  params: UpdatePositionParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const {
    contributor,
    positionId,
    title,
    description,
    runUnitOfWork,
    subjectSource,
    positionRepo,
  } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_position')) {
    const rank = requiredRank('edit_position')
    return Either.left(`Vous devez être ${rank} pour modifier une position.`)
  }

  const decoded = S.decodeUnknownEither(UpdatePositionInput, { errors: 'all' })({
    title,
    description,
  })

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    const fieldErrors: FieldErrors = {}
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'title') {
        fieldErrors.title = 'Le titre doit faire entre 3 et 255 caractères.'
      } else if (field === 'description') {
        fieldErrors.description = 'La description doit faire au moins 10 caractères.'
      }
    }
    return Either.left(Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.')
  }

  const existing = await Effect.runPromise(positionRepo.findById(positionId))
  if (!existing) {
    return Either.left('Position introuvable.')
  }

  const outcome = await runCommand(
    pipe(
      ensureStream(subjectAggregate, runUnitOfWork, existing.subjectId, subjectSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            decideOnSubject(events, existing.subjectId, contributor.id, (state) =>
              findPosition(state, positionId)
                ? Effect.succeed([editPosition({ positionId, title, description })])
                : Effect.fail(new Rejected('Position introuvable.')),
            ),
            Effect.tap(() =>
              grant(
                events,
                contributor.id,
                rewardFor(contributor.id, 'edited_position', {
                  relatedEntityType: 'position',
                  relatedEntityId: positionId,
                }),
              ),
            ),
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  const position = findPosition(outcome.right, positionId)
  if (!position) throw new Error('The position just edited is missing from the subject')

  return Either.right(position)
}
