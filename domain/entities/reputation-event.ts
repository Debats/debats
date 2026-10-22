export type RelatedEntityType =
  | 'subject'
  | 'public_figure'
  | 'organisation'
  | 'organisation_membership'
  | 'position'
  | 'statement'
  | 'argument'
  | 'invitation'

export type ReputationEvent = {
  id: string
  contributorId: string
  /** The deed rewarded, as the scale named it at the time: the history keeps actions the scale has dropped */
  action: string
  amount: number
  relatedEntityType?: RelatedEntityType
  relatedEntityId?: string
  createdAt: Date
}
