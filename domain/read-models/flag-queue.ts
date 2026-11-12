import { ReviewedEntity } from '../aggregates/review'
import {
  FlagOutcome,
  FlagReason,
  REVIEWED_ENTITY_TYPES,
  ReviewedEntityType,
} from '../aggregates/review-events'
import { FLAGS_HREF } from './hrefs'

/**
 * What a moderator reads to settle flags: the flags themselves, gathered by
 * the entity they are about, and enough of each entity to know it at a glance.
 */
export interface QueuedFlag {
  id: string
  entity: ReviewedEntity
  reason: FlagReason
  comment: string
  /** The reader's name as the site shows it; null when she gave none */
  by: string | null
  at: Date
  /** Null while the flag is open */
  outcome: FlagOutcome | null
  answer: string | null
  settledBy: string | null
  settledAt: Date | null
}

export interface FlaggedEntity {
  entity: ReviewedEntity
  /** Oldest first: the order they were raised in */
  flags: QueuedFlag[]
}

/** An entity as the queue names it, whatever its kind */
export interface EntityCard {
  title: string
  /** What tells it apart: the position of a statement, the subject of a position… */
  detail: string | null
  /** Its page on the site; null once it left */
  href: string | null
  /** Where it is edited; null when it has no form of its own, or has left the site */
  editHref: string | null
}

export const ENTITY_KIND_LABELS: Record<ReviewedEntityType, string> = {
  statement: 'Prise de position',
  subject: 'Sujet',
  public_figure: 'Personnalité',
  organisation: 'Organisation',
  position: 'Position',
  argument: 'Argument',
}

export const FLAG_OUTCOME_LABELS: Record<FlagOutcome, string> = {
  corrected: 'Corrigé',
  dismissed: 'Écarté',
  removed: 'Retiré',
}

const firstRaised = (flags: QueuedFlag[]) => flags[0].at.getTime()

/** The flags gathered by entity, the entity that has waited longest first */
export function queueOf(flags: readonly QueuedFlag[]): FlaggedEntity[] {
  const byEntity = new Map<string, FlaggedEntity>()
  for (const flag of [...flags].sort((a, b) => a.at.getTime() - b.at.getTime())) {
    const entry = byEntity.get(flag.entity.id) ?? { entity: flag.entity, flags: [] }
    entry.flags.push(flag)
    byEntity.set(flag.entity.id, entry)
  }
  return Array.from(byEntity.values()).sort((a, b) => firstRaised(a.flags) - firstRaised(b.flags))
}

/** Which flags the queue shows: those to settle or those settled, of one kind or of all */
export interface FlagsView {
  settled: boolean
  type: ReviewedEntityType | null
}

const isKind = (value: string | undefined): value is ReviewedEntityType =>
  (REVIEWED_ENTITY_TYPES as readonly string[]).includes(value ?? '')

export function parseFlagsView(params: { vue?: string; type?: string }): FlagsView {
  return { settled: params.vue === 'traites', type: isKind(params.type) ? params.type : null }
}

export function flagsViewHref(view: FlagsView): string {
  const query = new URLSearchParams({
    ...(view.settled ? { vue: 'traites' } : {}),
    ...(view.type ? { type: view.type } : {}),
  }).toString()
  return query ? `${FLAGS_HREF}?${query}` : FLAGS_HREF
}
