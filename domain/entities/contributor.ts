import * as S from 'effect/Schema'
import { canPerform, getRank, type Action } from '../reputation/permissions'

export const ContributorId = S.String.pipe(S.brand('ContributorId'))
export type ContributorId = S.Schema.Type<typeof ContributorId>

export const Reputation = S.optionalWith(S.Number, { default: () => 0 })

export const Contributor = S.Struct({
  id: ContributorId,
  reputation: Reputation,
  createdAt: S.Date,
  updatedAt: S.Date,
})

export type Contributor = S.Schema.Type<typeof Contributor>

export const createContributor = (params: {
  id: string
  reputation?: number
}): Contributor => {
  const now = new Date()

  return Contributor.make({
    id: ContributorId.make(params.id),
    reputation: params.reputation ?? 0,
    createdAt: now,
    updatedAt: now,
  })
}

export const contributorCanPerform = (contributor: Contributor, action: Action): boolean =>
  canPerform(contributor.reputation, action)

export const contributorRank = (contributor: Contributor) =>
  getRank(contributor.reputation)

export const addReputation = (contributor: Contributor, amount: number): Contributor => ({
  ...contributor,
  reputation: contributor.reputation + amount,
  updatedAt: new Date(),
})
