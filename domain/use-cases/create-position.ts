import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { PositionId } from '../entities/position'
import { addPosition } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { allowedTo, fieldsOf } from './preconditions'
import { decideOnSubject, subjectAggregate, writtenPosition } from './subject-stream'

// The spaces around a title mean nothing: they are dropped before it is judged
const CreatePositionInput = S.Struct({
  title: S.Trim.pipe(S.minLength(3), S.maxLength(255)),
  description: S.Trim.pipe(S.minLength(10)),
})

/**
 * What the form of a new position sends: the fields as they were typed, which
 * the schema above judges and hands to the command.
 */
export type NewPosition = S.Schema.Encoded<typeof CreatePositionInput>

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 255 caractères.',
  description: 'La description doit faire au moins 10 caractères.',
}

type CreatePositionParams = NewPosition & {
  contributor: ContributorIdentity | null
  subjectId: string
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
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(events, subjectId, contributor.id, addPosition({ positionId, ...input })),
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
