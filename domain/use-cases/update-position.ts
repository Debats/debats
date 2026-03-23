import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { updatePositionTitle, updatePositionDescription, Position } from '../entities/position'
import { PositionRepository } from '../repositories/position-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

const UpdatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

type UpdatePositionParams = {
  contributor: ContributorIdentity | null
  positionId: string
  title: string
  description: string
  positionRepo: PositionRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

export async function updatePositionUseCase(
  params: UpdatePositionParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const { contributor, positionId, title, description, positionRepo, reputationRepo } = params

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

  const updated = updatePositionDescription(updatePositionTitle(existing, title), description)

  const saved = await Effect.runPromise(positionRepo.update(updated))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_position',
      amount: reputationReward('edited_position'),
      relatedEntityType: 'position',
      relatedEntityId: saved.id,
    }),
  )

  return Either.right(saved)
}
