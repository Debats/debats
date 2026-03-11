import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createPosition, Position } from '../entities/position'
import { PositionRepository } from '../repositories/position-repository'
import { SubjectRepository } from '../repositories/subject-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

const CreatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

type CreatePositionParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  title: string
  description: string
  positionRepo: PositionRepository
  subjectRepo: SubjectRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

export async function createPositionUseCase(
  params: CreatePositionParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const { contributor, subjectId, title, description, positionRepo, subjectRepo, reputationRepo } =
    params

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

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))
  if (!subject) {
    return Either.left('Le sujet sélectionné est introuvable.')
  }

  const position = createPosition({
    title,
    description,
    subjectId,
    createdBy: contributor.id,
  })

  const createdPosition = await Effect.runPromise(positionRepo.create(position))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_position_validated',
      amount: reputationReward('added_position_validated'),
      relatedEntityType: 'position',
      relatedEntityId: createdPosition.id,
    }),
  )

  return Either.right(createdPosition)
}
