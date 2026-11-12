import * as S from 'effect/Schema'
import { ReviewedEntity } from '../aggregates/review'
import { FlagReason, REVIEWED_ENTITY_TYPES, ReviewedEntityType } from '../aggregates/review-events'
import { canPerform } from '../reputation/permissions'

/**
 * Whether what a page sends names an entity a reader may review: one of the
 * six kinds, and an id that is one. What arrives at an action has no type.
 */
export const isReviewedEntity: (input: unknown) => input is ReviewedEntity = S.is(
  S.Struct({ type: S.Literal(...REVIEWED_ENTITY_TYPES), id: S.UUID }),
)

/**
 * What a page shows of the review of an entity. At rest, a mark: two counts
 * and what the viewer did herself. On demand, the detail: who confirmed,
 * which flags are open and what they say.
 */
export interface ReviewMark {
  confirmations: number
  openFlags: number
  confirmedByViewer: boolean
  flaggedByViewer: boolean
}

/** The mark of an entity nobody confirmed or flagged */
export const UNREVIEWED: ReviewMark = {
  confirmations: 0,
  openFlags: 0,
  confirmedByViewer: false,
  flaggedByViewer: false,
}

/** The marks of the entities of a page, by entity id; an entity nobody reviewed has no entry */
export type ReviewMarks = Readonly<Record<string, ReviewMark>>

export const markOf = (marks: ReviewMarks, entityId: string): ReviewMark =>
  marks[entityId] ?? UNREVIEWED

/** Who looks at the mark: it shows the same to all, and offers each what she may do */
export type Viewer = 'visitor' | 'reader' | 'moderator'

export const viewerOf = (contributor: { reputation: number } | null): Viewer => {
  if (!contributor) return 'visitor'
  return canPerform(contributor.reputation, 'settle_flag') ? 'moderator' : 'reader'
}

export interface OpenFlagDetail {
  id: string
  reason: FlagReason
  comment: string
  /** The reader's name as the site shows it; null when she gave none */
  by: string | null
  at: Date
}

export interface ReviewDetail {
  confirmations: number
  /** The names of the last readers who confirmed, most recent first; those who gave none are left out */
  confirmers: string[]
  lastConfirmedAt: Date | null
  flags: OpenFlagDetail[]
  /** The viewer added the entity herself: it is for others to review */
  addedByViewer: boolean
}

export const FLAG_REASON_LABELS: Record<FlagReason, string> = {
  inaccurate_quote: 'La citation n’est pas exacte',
  source_mismatch: 'La source ne dit pas cela, ou n’est plus accessible',
  wrong_position_or_date: 'Ce n’est pas la bonne position, ou la bonne date',
  duplicate: 'C’est un doublon',
  other: 'Autre chose',
}

/** How each kind of entity is named in a sentence, and whether it is feminine */
const NOUNS: Record<ReviewedEntityType, { this: string; feminine: boolean }> = {
  statement: { this: 'cette prise de position', feminine: true },
  subject: { this: 'ce sujet', feminine: false },
  public_figure: { this: 'cette personnalité', feminine: true },
  organisation: { this: 'cette organisation', feminine: true },
  position: { this: 'cette position', feminine: true },
  argument: { this: 'cet argument', feminine: false },
}

/** « cette prise de position », « cet argument » */
export const thisEntity = (type: ReviewedEntityType): string => NOUNS[type].this

/**
 * The participles a review is told with. Only these: they take their
 * feminine by a final « e », which is not true of any French word.
 */
type Participle = 'Confirmé' | 'vérifié'

/** A participle agreed with the entity: « confirmée » for a statement, « confirmé » for a subject */
export const agreed = (type: ReviewedEntityType, participle: Participle): string =>
  NOUNS[type].feminine ? `${participle}e` : participle

const readers = (count: number) => `${count} ${count <= 1 ? 'lecteur·rice' : 'lecteur·rices'}`
const others = (count: number) => `${count} ${count <= 1 ? 'autre' : 'autres'}`

function confirmedBy(mark: ReviewMark): string {
  if (!mark.confirmedByViewer) return readers(mark.confirmations)
  return mark.confirmations === 1 ? 'vous' : `vous et ${others(mark.confirmations - 1)}`
}

/** The mark in words, for who cannot see it: « Confirmée par 12 lecteur·rices, 1 signalement en cours » */
export function markLabel(type: ReviewedEntityType, mark: ReviewMark): string {
  const checked =
    mark.confirmations === 0
      ? `Pas encore ${agreed(type, 'vérifié')}`
      : `${agreed(type, 'Confirmé')} par ${confirmedBy(mark)}`
  const flagged =
    mark.openFlags === 0
      ? ''
      : `, ${mark.openFlags} ${mark.openFlags === 1 ? 'signalement' : 'signalements'} en cours`
  return `${checked}${flagged}`
}

/** Who confirmed, in a few words: the names the site knows, then how many others */
export function confirmersLine(names: readonly string[], total: number): string {
  if (names.length === 0) return readers(total)
  const unnamed = total - names.length
  if (unnamed > 0) return `${names.join(', ')} et ${others(unnamed)}`
  return names.length === 1
    ? names[0]
    : `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
}
