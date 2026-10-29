import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { PositionId } from '../entities/position'
import { addPosition } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { allowedTo, fieldsOf } from './preconditions'
import { decideOnSubject, subjectAggregate, writtenPosition } from './subject-stream'

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
}

export type { FieldErrors }

export function createPositionUseCase(params: CreatePositionParams) {
  const { subjectId, title, description } = params
  // The command names the position, inside the subject's stream
  const positionId = PositionId.make(crypto.randomUUID())

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_position', 'proposer une nouvelle position'),
      input: fieldsOf(CreatePositionInput, FIELD_MESSAGES)({ title, description }),
    }),
    Effect.tap(() => ensureStream(subjectAggregate, subjectId)),
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
  )
}
