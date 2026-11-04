import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { editPosition, POSITION_NOT_FOUND } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { allowedTo, fieldsOf, found } from './preconditions'
import { decideOnSubject, subjectAggregate, writtenPosition } from './subject-stream'

// The spaces around a title mean nothing: they are dropped before it is judged
const UpdatePositionInput = S.Struct({
  title: S.Trim.pipe(S.minLength(3), S.maxLength(255)),
  description: S.Trim.pipe(S.minLength(10)),
})

/** What the edit form of a position sends: its fields, and the revision it shows. */
export type EditedPosition = S.Schema.Encoded<typeof UpdatePositionInput> & {
  /** The revision of the subject's stream the form was rendered from */
  revision: number
}

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 255 caractères.',
  description: 'La description doit faire au moins 10 caractères.',
}

type UpdatePositionParams = EditedPosition & {
  contributor: ContributorIdentity | null
  positionId: string
}

export type { FieldErrors }

/** Read side: which subject the position belongs to */
const positions = Effect.serviceFunctions(PositionRepository)

export function updatePositionUseCase(params: UpdatePositionParams) {
  const { positionId, title, description, revision } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'edit_position', 'modifier une position'),
      input: fieldsOf(UpdatePositionInput, FIELD_MESSAGES)({ title, description }),
      existing: Effect.flatMap(positions.findById(positionId), found(POSITION_NOT_FOUND)),
    }),
    Effect.flatMap(({ contributor, input, existing }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(
            events,
            existing.subjectId,
            contributor.id,
            editPosition({ positionId, ...input }),
            revision,
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
    Effect.flatMap(writtenPosition(positionId)),
  )
}
