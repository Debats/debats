import { Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { SubjectTitle } from '../entities/subject'
import { editSubject } from '../aggregates/subject'
import { runUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { grant, rewardFor } from './reward'
import { allowedTo, decoded } from './preconditions'
import { uniqueTakenAs } from './run-command'
import { decideOnSubject, subjectAggregate } from './subject-stream'

// The spaces around a title mean nothing: they are dropped before it is judged
const UpdateSubjectInput = S.Struct({
  title: S.Trim.pipe(S.compose(SubjectTitle)),
  presentation: S.Trim.pipe(S.minLength(10)),
  problem: S.Trim.pipe(S.minLength(10)),
})

/** What the edit form of a subject sends: its fields, and the revision it shows. */
export type EditedSubject = S.Schema.Encoded<typeof UpdateSubjectInput> & {
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
}

type UpdateSubjectParams = EditedSubject & {
  contributor: ContributorIdentity | null
  subjectId: string
}

export function updateSubjectUseCase(params: UpdateSubjectParams) {
  const { subjectId, title, presentation, problem, revision } = params

  return pipe(
    Effect.all({
      contributor: allowedTo(params.contributor, 'edit_subject', 'modifier un sujet'),
      edited: decoded(UpdateSubjectInput)({ title, presentation, problem }),
    }),
    Effect.flatMap(({ contributor, edited }) =>
      runUnitOfWork((events) =>
        pipe(
          decideOnSubject(events, subjectId, contributor.id, editSubject(edited), revision),
          Effect.tap(() =>
            grant(
              events,
              contributor.id,
              rewardFor(contributor.id, 'edited_subject', {
                relatedEntityType: 'subject',
                relatedEntityId: subjectId,
              }),
            ),
          ),
        ),
      ),
    ),
    uniqueTakenAs('title', 'Un sujet porte déjà ce titre.'),
    Effect.map(({ state }) => state.subject),
  )
}
