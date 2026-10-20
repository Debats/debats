import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { Position, PositionId } from '../entities/position'
import { addPosition, findPosition } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { runCommand } from './run-command'
import { decideOnSubject, SubjectSource } from './subject-stream'

const CreatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

type CreatePositionParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  title: string
  description: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

export type { FieldErrors }

export async function createPositionUseCase(
  params: CreatePositionParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const { contributor, subjectId, title, description, runUnitOfWork, subjectSource } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_position')) {
    const rank = requiredRank('add_position')
    return Either.left(`Vous devez être ${rank} pour proposer une nouvelle position.`)
  }

  const decoded = S.decodeUnknownEither(CreatePositionInput, { errors: 'all' })({
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

  // The command names the position, inside the subject's stream
  const positionId = PositionId.make(crypto.randomUUID())
  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        decideOnSubject(events, subjectId, subjectSource, contributor.id, () =>
          Effect.succeed([addPosition({ positionId, title, description })]),
        ),
        Effect.tap(() =>
          grant(
            events,
            contributor.id,
            rewardFor(contributor.id, 'added_position_validated', {
              relatedEntityType: 'position',
              relatedEntityId: positionId,
            }),
          ),
        ),
      ),
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  const position = findPosition(outcome.right, positionId)
  if (!position) throw new Error('The position just added is missing from the subject')

  return Either.right(position)
}
