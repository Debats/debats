import { type RewardableAction } from '../reputation/permissions'

export type RelatedEntityType =
  | 'subject'
  | 'public_figure'
  | 'position'
  | 'statement'
  | 'invitation'

export type ReputationEvent = {
  id: string
  contributorId: string
  action: RewardableAction
  amount: number
  relatedEntityType?: RelatedEntityType
  relatedEntityId?: string
  createdAt: Date
}
