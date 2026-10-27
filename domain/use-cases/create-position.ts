import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Position, PositionId } from '../entities/position'
import { addPosition } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { allowedTo, fieldsOf } from './preconditions'
import { runFormCommand } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource, writtenPosition } from './subject-stream'

const CreatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 255 caractères.',
  description: 'La description doit faire au moins 10 caractères.',
}

type CreatePositionParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  title: string
  description: string
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

export type { FieldErrors }

export function createPositionUseCase(
  params: CreatePositionParams,
): Promise<Either.Either<Position, string | FieldErrors>> {
  const { subjectId, title, description, runUnitOfWork, subjectSource } = params
  // The command names the position, inside the subject's stream
  const positionId = PositionId.make(crypto.randomUUID())

  return runFormCommand(
    pipe(
      Effect.all({
        contributor: allowedTo(
          params.contributor,
          'add_position',
          'proposer une nouvelle position',
        ),
        input: fieldsOf(CreatePositionInput, FIELD_MESSAGES)({ title, description }),
      }),
      Effect.tap(() => ensureStream(subjectAggregate, runUnitOfWork, subjectId, subjectSource)),
      Effect.flatMap(({ contributor, input }) =>
        runUnitOfWork((events) =>
          pipe(
            decideOnSubject(events, subjectId, contributor.id, () =>
              Effect.succeed([addPosition({ positionId, ...input })]),
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
      ),
      Effect.flatMap(writtenPosition(positionId)),
    ),
  )
}
