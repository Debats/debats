import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { Subject, SubjectTitle } from '../entities/subject'
import { editSubject } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'
import { grant, rewardFor } from './reward'
import { ensureStream } from './aggregate-stream'
import { runCommand } from './run-command'
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
  runUnitOfWork: RunUnitOfWork
  subjectSource: SubjectSource
}

export async function updateSubjectUseCase(
  params: UpdateSubjectParams,
): Promise<Either.Either<Subject, string>> {
  const { contributor, subjectId, title, presentation, problem, runUnitOfWork, subjectSource } =
    params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'edit_subject')) {
    const rank = requiredRank('edit_subject')
    return Either.left(`Vous devez être ${rank} pour modifier un sujet.`)
  }

  const decoded = S.decodeUnknownEither(UpdateSubjectInput)({ title, presentation, problem })

  if (Either.isLeft(decoded)) {
    return Either.left('Données invalides. Vérifiez les champs du formulaire.')
  }

  const outcome = await runCommand(
    pipe(
      ensureStream(subjectAggregate, runUnitOfWork, subjectId, subjectSource),
      Effect.andThen(
        runUnitOfWork((events) =>
          pipe(
            decideOnSubject(events, subjectId, contributor.id, () =>
              Effect.succeed([editSubject(decoded.right)]),
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
    ),
  )
  if (Either.isLeft(outcome)) return Either.left(outcome.left)

  return Either.right(outcome.right.subject)
}
