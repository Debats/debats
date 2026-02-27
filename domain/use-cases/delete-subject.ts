import { Either } from 'effect'
import { Effect } from 'effect'
import { isMajorSubject } from '../entities/subject'
import { SubjectRepository } from '../repositories/subject-repository'
import { ReputationRepository } from '../repositories/reputation-repository'
import { canPerform, requiredRank } from '../reputation/permissions'

type Contributor = { id: string; reputation: number }

type DeleteSubjectParams = {
  contributor: Contributor | null
  subjectId: string
  subjectRepo: SubjectRepository
  reputationRepo: ReputationRepository
}

export async function deleteSubjectUseCase(
  params: DeleteSubjectParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId, subjectRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  const subject = await Effect.runPromise(subjectRepo.findById(subjectId))

  if (!subject) {
    return Either.left('Sujet introuvable.')
  }

  const stats = await Effect.runPromise(subjectRepo.getStats(subjectId))
  const isMajor = isMajorSubject(subject, stats.statementsCount)
  const action = isMajor ? ('delete_major_subject' as const) : ('delete_minor_subject' as const)

  if (!canPerform(contributor.reputation, action)) {
    const rank = requiredRank(action)
    return Either.left(`Vous devez être ${rank} pour supprimer ce sujet.`)
  }

  await Effect.runPromise(subjectRepo.delete(subjectId))

  return Either.right(undefined)
}
