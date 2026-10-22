import { Either, Effect, pipe } from 'effect'
import * as S from 'effect/Schema'
import { ArrayFormatter } from 'effect/ParseResult'
import { generateSlug, Subject, SubjectId, SubjectTitle } from '../entities/subject'
import { addSubject, replaySubject, subjectStream } from '../aggregates/subject'
import { RunUnitOfWork } from '../events/unit-of-work'
import { SubjectRepository } from '../repositories/subject-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'
import { grant, rewardFor } from './reward'
import { runCommand } from './run-command'
import { requireSubjectState } from './subject-stream'

const CreateSubjectInput = S.Struct({
  title: SubjectTitle,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

type CreateSubjectParams = {
  contributor: ContributorIdentity | null
  title: string
  presentation: string
  problem: string
  runUnitOfWork: RunUnitOfWork
  /** Read side: the title must be free */
  subjectRepo: SubjectRepository
}

export type { FieldErrors }

export async function createSubjectUseCase(
  params: CreateSubjectParams,
): Promise<Either.Either<Subject, string | FieldErrors>> {
  const { contributor, title, presentation, problem, runUnitOfWork, subjectRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_subject')) {
    const rank = requiredRank('add_subject')
    return Either.left(`Vous devez être ${rank} pour créer un sujet.`)
  }

  const decoded = S.decodeUnknownEither(CreateSubjectInput, { errors: 'all' })({
    title,
    presentation,
    problem,
  })

  if (Either.isLeft(decoded)) {
    const issues = ArrayFormatter.formatErrorSync(decoded.left)
    const fieldErrors: FieldErrors = {}
    for (const issue of issues) {
      const field = issue.path.join('.')
      if (field === 'title') {
        fieldErrors.title = 'Le titre doit faire entre 3 et 100 caractères.'
      } else if (field === 'presentation') {
        fieldErrors.presentation = 'La présentation doit faire au moins 10 caractères.'
      } else if (field === 'problem') {
        fieldErrors.problem = 'La problématique doit faire au moins 10 caractères.'
      }
    }
    return Either.left(Object.keys(fieldErrors).length > 0 ? fieldErrors : 'Données invalides.')
  }

  const taken = await Effect.runPromise(subjectRepo.findBySlug(generateSlug(decoded.right.title)))
  if (taken) {
    return Either.left({ title: 'Un sujet porte déjà ce titre.' })
  }

  // The command names the subject: the stream exists from its first event
  const id = SubjectId.make(crypto.randomUUID())
  const outcome = await runCommand(
    runUnitOfWork((events) =>
      pipe(
        events.append(subjectStream(id), 0, [addSubject(decoded.right)], {
          actorId: contributor.id,
        }),
        Effect.flatMap(replaySubject),
        Effect.flatMap(requireSubjectState),
        Effect.tap(() =>
          grant(
            events,
            contributor.id,
            rewardFor(contributor.id, 'added_subject', {
              relatedEntityType: 'subject',
              relatedEntityId: id,
            }),
          ),
        ),
      ),
    ),
  )

  return Either.map(outcome, (state) => state.subject)
}
