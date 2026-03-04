import { Either } from 'effect'
import * as S from 'effect/Schema'
import { Effect } from 'effect'
import { SubjectTitle, Subject, generateSlug } from '../entities/subject'
import { SubjectRepository } from '../repositories/subject-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank, reputationReward } from '../reputation/permissions'

const UpdateSubjectInput = S.Struct({
  title: SubjectTitle,
  presentation: S.String.pipe(S.minLength(10)),
  problem: S.String.pipe(S.minLength(10)),
})

type Contributor = { id: string; reputation: number }

type UpdateSubjectParams = {
  contributor: Contributor | null
  subjectId: string
  title: string
  presentation: string
  problem: string
  subjectRepo: SubjectRepository
  reputationRepo: ReputationRepository
}

export async function updateSubjectUseCase(
  params: UpdateSubjectParams,
): Promise<Either.Either<Subject, string>> {
  const { contributor, subjectId, title, presentation, problem, subjectRepo, reputationRepo } =
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

  const input = decoded.right

  const existing = await Effect.runPromise(subjectRepo.findById(subjectId))

  if (!existing) {
    return Either.left('Sujet introuvable.')
  }

  const updated: Subject = {
    ...existing,
    title: SubjectTitle.make(input.title),
    slug: generateSlug(input.title),
    presentation: input.presentation,
    problem: input.problem,
    updatedAt: new Date(),
  }

  const saved = await Effect.runPromise(subjectRepo.update(updated))

  await Effect.runPromise(
    reputationRepo.recordEvent({
      contributorId: contributor.id,
      action: 'edited_subject',
      amount: reputationReward('edited_subject'),
      relatedEntityType: 'subject',
      relatedEntityId: saved.id,
    }),
  )

  return Either.right(saved)
}
