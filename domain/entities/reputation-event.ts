/** What a grant may reward: the kinds of entity a deed is about */
export const RELATED_ENTITY_TYPES = [
  'subject',
  'public_figure',
  'organisation',
  'organisation_membership',
  'position',
  'statement',
  'argument',
  'invitation',
] as const

export type RelatedEntityType = (typeof RELATED_ENTITY_TYPES)[number]

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
