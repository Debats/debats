import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { ArrayFormatter } from 'effect/ParseResult'
import { createSubject, SubjectTitle, Subject } from '../entities/subject'
import { SubjectRepository } from '../repositories/subject-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'
import { ContributorIdentity, FieldErrors } from './types'

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
  subjectRepo: SubjectRepository
  reputationRepo: ReputationRepository
}

export type { FieldErrors }

export async function createSubjectUseCase(
  params: CreateSubjectParams,
): Promise<Either.Either<Subject, string | FieldErrors>> {
  const { contributor, title, presentation, problem, subjectRepo, reputationRepo } = params

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

  const input = decoded.right

  const subject = createSubject({
    title: input.title,
    presentation: input.presentation,
    problem: input.problem,
    createdBy: contributor.id,
  })

  const created = await Effect.runPromise(subjectRepo.create(subject))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'added_subject',
      amount: reputationReward('added_subject'),
      relatedEntityType: 'subject',
      relatedEntityId: created.id,
    }),
  )

  return Either.right(created)
}
