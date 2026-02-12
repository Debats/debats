import * as S from 'effect/Schema'

export const ContributorId = S.String.pipe(S.brand('ContributorId'))
export type ContributorId = S.Schema.Type<typeof ContributorId>

export const Reputation = S.optionalWith(S.Number.pipe(S.nonNegative()), { default: () => 0 })

export const MIN_REPUTATION_CREATE_SUBJECT = 50
export const MIN_REPUTATION_EDIT = 100

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

export const canCreateSubject = (contributor: Contributor): boolean =>
  contributor.reputation >= MIN_REPUTATION_CREATE_SUBJECT

export const canEdit = (contributor: Contributor): boolean =>
  contributor.reputation >= MIN_REPUTATION_EDIT

export const addReputation = (contributor: Contributor, amount: number): Contributor => ({
  ...contributor,
  reputation: Math.max(0, contributor.reputation + amount),
  updatedAt: new Date(),
})
