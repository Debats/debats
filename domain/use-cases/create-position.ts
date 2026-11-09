import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { PositionId } from '../entities/position'
import { addPosition } from '../aggregates/subject'
import { EventStore } from '../events/event-store'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, Grant, rewardFor } from './reward'
import { allowedTo, fieldsOf } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { decideOnSubject, writtenPosition } from './subject-stream'

// The spaces around a title mean nothing: they are dropped before it is judged
const Title = S.Trim.pipe(S.minLength(3), S.maxLength(255))
const Description = S.Trim.pipe(S.minLength(10))

const CreatePositionInput = S.Struct({ title: Title, description: Description })

/**
 * The same two fields, named as the all-in-one contribution form names its
 * inputs. That form can also open a new subject, which has a title of its
 * own, so a bare `title` would not say which one is at fault.
 */
const InlinePositionInput = S.Struct({ positionTitle: Title, positionDescription: Description })

/**
 * What the form of a new position sends: the fields as they were typed, which
 * the schema above judges and hands to the command.
 */
export type NewPosition = S.Schema.Encoded<typeof CreatePositionInput>

/** What the all-in-one form sends when it opens a position instead of choosing one */
export type InlinePosition = S.Schema.Encoded<typeof InlinePositionInput>

/**
 * A position chosen rather than opened. Nothing chosen is its own refusal: a
 * subject with no position yet offers nothing to choose, and « introuvable »
 * would blame the contributor for a list that was empty.
 *
 * The subject travels with it, because it is asked for first: without it the
 * position cannot even be looked for, and the fault would be told on the
 * position — « choisissez une position » for a subject left empty.
 */
const ChosenPositionInput = S.Struct({
  subjectId: S.String.pipe(S.minLength(1)),
  positionId: S.String.pipe(S.minLength(1)),
})

const CHOSEN_FIELD_MESSAGES = {
  subjectId: 'Choisissez un sujet, ou créez-en un.',
  positionId: 'Choisissez une position, ou proposez-en une.',
}

/** That a subject and a position were chosen at all, each under its own name */
export const chosenPositionField = (subjectId: string, positionId: string) =>
  fieldsOf(ChosenPositionInput, CHOSEN_FIELD_MESSAGES)({ subjectId, positionId })

const TITLE_FAULT = 'Le titre doit faire entre 3 et 255 caractères.'
const DESCRIPTION_FAULT = 'La description doit faire au moins 10 caractères.'

const FIELD_MESSAGES = { title: TITLE_FAULT, description: DESCRIPTION_FAULT }

const INLINE_FIELD_MESSAGES = {
  positionTitle: TITLE_FAULT,
  positionDescription: DESCRIPTION_FAULT,
}

/** The fields of a position opened from the all-in-one form, judged under their own names */
export const inlinePositionFields = (input: InlinePosition) =>
  Effect.map(
    fieldsOf(InlinePositionInput, INLINE_FIELD_MESSAGES)(input),
    ({ positionTitle, positionDescription }) => ({
      title: positionTitle,
      description: positionDescription,
    }),
  )

/**
 * A title whose slug already names a position of this subject: the command
 * could not see it coming — the list it was choosing from may have been a
 * moment old — so the projector's refusal is told on the field that caused it.
 */
export const POSITION_TITLE_TAKEN = 'Une position de ce titre existe déjà sur ce sujet.'

/**
 * Writes a position on its subject's stream, inside the transaction it is
 * given. The command that opens a position alone and the one that opens it
 * together with its first statement both come through here, so one place
 * knows how a position comes into being.
 *
 * The reward is left to the caller, who may have others to grant in the same
 * breath: a contributor's gains go to her stream in a single append.
 */
export const recordNewPosition = (
  events: EventStore,
  subjectId: string,
  contributorId: string,
  input: { title: string; description: string },
) => {
  // The command names the position, inside the subject's stream
  const positionId = PositionId.make(crypto.randomUUID())
  return pipe(
    decideOnSubject(events, subjectId, contributorId, addPosition({ positionId, ...input })),
    Effect.flatMap(writtenPosition(positionId)),
  )
}

/** What opening a position earns, for the caller to grant alongside its others */
export const positionReward = (contributorId: string, positionId: string): Grant =>
  rewardFor(contributorId, 'added_position_validated', {
    relatedEntityType: 'position',
    relatedEntityId: positionId,
  })

export type { FieldErrors }

type CreatePositionParams = NewPosition & {
  contributor: ContributorIdentity | null
  subjectId: string
}

export function createPositionUseCase(params: CreatePositionParams) {
  const { subjectId, title, description } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'add_position', 'proposer une nouvelle position'),
      input: fieldsOf(CreatePositionInput, FIELD_MESSAGES)({ title, description }),
    }),
    Effect.flatMap(({ contributor, input }) =>
      runUnitOfWork((events) =>
        pipe(
          recordNewPosition(events, subjectId, contributor.id, input),
          Effect.tap((position) =>
            grant(events, contributor.id, positionReward(contributor.id, position.id)),
          ),
        ),
      ),
    ),
    uniqueTakenAs('title', POSITION_TITLE_TAKEN),
  )
}
