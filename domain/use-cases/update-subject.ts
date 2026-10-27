import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Subject, SubjectTitle } from '../entities/subject'
import { editSubject } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { ContributorIdentity } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { allowedTo, decoded } from './preconditions'
import { runCommand, uniqueTakenAs } from './run-command'
import { decideOnSubject, subjectAggregate, SubjectSource } from './subject-stream'

const UpdateSubjectInput = S.Struct({
  title: SubjectTitle,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

type UpdateSubjectParams = {
  contributor: ContributorIdentity | null
  subjectId: string
  title: string
  presentation: string
  problem: string
  /** The revision the form was rendered from: what someone else wrote meanwhile is not overwritten */
  revision: number
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

export function updateSubjectUseCase(
  params: UpdateSubjectParams,
): Promise<Either.Either<Subject, string>> {
  const { subjectId, title, presentation, problem, revision, runUnitOfWork, subjectSource } = params

  return runCommand(
    pipe(
      Effect.all({
        contributor: allowedTo(params.contributor, 'edit_subject', 'modifier un sujet'),
        edited: decoded(UpdateSubjectInput)({ title, presentation, problem }),
      }),
      Effect.tap(() => ensureStream(subjectAggregate, runUnitOfWork, subjectId, subjectSource)),
      Effect.flatMap(({ contributor, edited }) =>
        runUnitOfWork((events) =>
          pipe(
            decideOnSubject(
              events,
              subjectId,
              contributor.id,
              () => Effect.succeed([editSubject(edited)]),
              revision,
            ),
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
    ),
  )
}
