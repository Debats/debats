import { Either, Effect } from 'effect'
import { SubjectRepository } from '../repositories/subject-repository'
import { RelatedSubjectsRepository } from '../repositories/related-subjects-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type LinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  subjectRepo: SubjectRepository
  relatedRepo: RelatedSubjectsRepository
}

export async function linkSubjectsUseCase(
  params: LinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId1, subjectId2, subjectRepo, relatedRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'link_subjects')) {
    const rank = requiredRank('link_subjects')
    return Either.left(`Vous devez être ${rank} pour lier des sujets.`)
  }

  if (subjectId1 === subjectId2) {
    return Either.left('Impossible de lier un sujet au même sujet.')
  }

  const [subject1, subject2] = await Promise.all([
    Effect.runPromise(subjectRepo.findById(subjectId1)),
    Effect.runPromise(subjectRepo.findById(subjectId2)),
  ])

  if (!subject1) {
    return Either.left(`Le sujet ${subjectId1} est introuvable.`)
  }
  if (!subject2) {
    return Either.left(`Le sujet ${subjectId2} est introuvable.`)
  }

  await Effect.runPromise(relatedRepo.link(subjectId1, subjectId2, contributor.id))

  return Either.right(undefined)
}
