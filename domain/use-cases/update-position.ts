import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { editPosition, findPosition } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { PositionRepository } from '../repositories/position-repository'
import { ContributorIdentity, FieldErrors, Rejected } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { allowedTo, fieldsOf, found } from './preconditions'
import { decideOnSubject, subjectAggregate, writtenPosition } from './subject-stream'

const UpdatePositionInput = S.Struct({
  title: S.String.pipe(S.minLength(3), S.maxLength(255)),
  description: S.String.pipe(S.minLength(10)),
})

const FIELD_MESSAGES = {
  title: 'Le titre doit faire entre 3 et 255 caractères.',
  description: 'La description doit faire au moins 10 caractères.',
}

const NOT_FOUND = 'Position introuvable.'

type UpdatePositionParams = {
  contributor: ContributorIdentity | null
  positionId: string
  title: string
  description: string
  /** The revision of the subject's stream the form was rendered from */
  revision: number
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
      existing: Effect.flatMap(positions.findById(positionId), found(NOT_FOUND)),
    }),
    Effect.tap(({ existing }) => ensureStream(subjectAggregate, existing.subjectId)),
    Effect.flatMap(({ contributor, input, existing }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(
            events,
            existing.subjectId,
            contributor.id,
            (state) =>
              findPosition(state, positionId)
                ? Effect.succeed([editPosition({ positionId, ...input })])
                : Effect.fail(new Rejected(NOT_FOUND)),
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
