import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { createSubject, SubjectTitle, Subject } from '../entities/subject'
import { SubjectRepository } from '../repositories/subject-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'

const CreateSubjectInput = S.Struct({
  title: SubjectTitle,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

type Contributor = { id: string; reputation: number }

type CreateSubjectParams = {
  contributor: Contributor | null
  title: string
  presentation: string
  problem: string
  subjectRepo: SubjectRepository
  reputationRepo: ReputationRepository
}

export async function createSubjectUseCase(
  params: CreateSubjectParams,
): Promise<Either.Either<Subject, string>> {
  const { contributor, title, presentation, problem, subjectRepo, reputationRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'add_subject')) {
    const rank = requiredRank('add_subject')
    return Either.left(`Vous devez être ${rank} pour créer un sujet.`)
  }

  const decoded = S.decodeUnknownEither(CreateSubjectInput)({ title, presentation, problem })

  if (Either.isLeft(decoded)) {
    return Either.left('Données invalides. Vérifiez les champs du formulaire.')
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
    reputationRepo.addReputation(contributor.id, reputationReward('added_subject')),
  )

  return Either.right(created)
}
