import { Either, Effect } from 'effect'
import { RelatedSubjectsRepository } from '../repositories/related-subjects-repository'
import { canPerform, requiredRank } from '../reputation/permissions'
import { ContributorIdentity } from './types'

type UnlinkSubjectsParams = {
  contributor: ContributorIdentity | null
  subjectId1: string
  subjectId2: string
  relatedRepo: RelatedSubjectsRepository
}

export async function unlinkSubjectsUseCase(
  params: UnlinkSubjectsParams,
): Promise<Either.Either<void, string>> {
  const { contributor, subjectId1, subjectId2, relatedRepo } = params

  if (!contributor) {
    return Either.left('Vous devez être connecté·e.')
  }

  if (!canPerform(contributor.reputation, 'link_subjects')) {
    const rank = requiredRank('link_subjects')
    return Either.left(`Vous devez être ${rank} pour modifier les liens entre sujets.`)
  }

  await Effect.runPromise(relatedRepo.unlink(subjectId1, subjectId2))

  return Either.right(undefined)
}
