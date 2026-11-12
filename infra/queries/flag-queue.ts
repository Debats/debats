import { Effect, pipe } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ReviewedEntity, reviewStream } from '../../domain/aggregates/review'
import { FlagOutcome, FlagReason, ReviewedEntityType } from '../../domain/aggregates/review-events'
import { Revision } from '../../domain/events/event-store'
import { EntityCard, FlagsView, QueuedFlag } from '../../domain/read-models/flag-queue'
import {
  argumentHref,
  figureHref,
  organisationHref,
  positionHref,
  statementEditHref,
  subjectHref,
} from '../../domain/read-models/hrefs'
import { authorOnSubjectHref } from '../../domain/read-models/statement-author'
import { DatabaseError } from '../../domain/repositories/errors'
import { databaseError } from '../database/database-error'
import { getPrismaClient } from '../prisma/client'
import { displayNames } from './display-names'

/** The queue is read whole: a moderation backlog longer than this is a problem of its own */
const QUEUE_LIMIT = 200

interface FlagRow {
  id: string
  entity_type: string
  entity_id: string
  reason: string
  comment: string
  status: string
  answer: string | null
  created_by: string
  updated_by: string
  created_at: string
  updated_at: string
}

const queued = (row: FlagRow, names: Map<string, string>): QueuedFlag => {
  const open = row.status === 'open'
  return {
    id: row.id,
    entity: { type: row.entity_type as ReviewedEntityType, id: row.entity_id },
    reason: row.reason as FlagReason,
    comment: row.comment,
    by: names.get(row.created_by) ?? null,
    at: new Date(row.created_at),
    outcome: open ? null : (row.status as FlagOutcome),
    answer: row.answer,
    settledBy: open ? null : (names.get(row.updated_by) ?? null),
    settledAt: open ? null : new Date(row.updated_at),
  }
}

/**
 * The flags of a view of the queue, with the names of who raised and who
 * settled them. Settled flags are not public: the client must be the
 * server's own, and the page must have checked who asks.
 */
export function loadFlags(
  supabase: SupabaseClient,
  view: FlagsView,
): Effect.Effect<QueuedFlag[], DatabaseError> {
  return named(supabase, async () => {
    const flags = supabase.from('flags').select('*').limit(QUEUE_LIMIT)
    const ofStatus = view.settled
      ? flags.neq('status', 'open').order('updated_at', { ascending: false })
      : flags.eq('status', 'open').order('created_at')
    return view.type ? ofStatus.eq('entity_type', view.type) : ofStatus
  })
}

/** The open flags of one entity, oldest first */
export function loadOpenFlagsOf(
  supabase: SupabaseClient,
  entity: ReviewedEntity,
): Effect.Effect<QueuedFlag[], DatabaseError> {
  return named(supabase, async () =>
    supabase
      .from('flags')
      .select('*')
      .eq('entity_id', entity.id)
      .eq('status', 'open')
      .order('created_at'),
  )
}

/** The flags a query finds, with the names of who raised and who settled them */
function named(
  supabase: SupabaseClient,
  find: () => Promise<{ data: unknown; error: unknown }>,
): Effect.Effect<QueuedFlag[], DatabaseError> {
  return pipe(
    Effect.tryPromise({
      try: async () => {
        const { data, error } = await find()

        if (error) throw error
        return data as FlagRow[]
      },
      catch: (error) => databaseError('Failed to load the flags', error),
    }),
    Effect.flatMap((rows) =>
      Effect.map(
        displayNames(
          supabase,
          rows.flatMap((row) => [row.created_by, row.updated_by]),
        ),
        (names) => rows.map((row) => queued(row, names)),
      ),
    ),
  )
}

/** How many entities wait for a moderator */
export function countFlaggedEntities(
  supabase: SupabaseClient,
): Effect.Effect<number, DatabaseError> {
  return Effect.tryPromise({
    try: async () => {
      const { data, error } = await supabase
        .from('flags')
        .select('entity_id')
        .eq('status', 'open')
        .limit(QUEUE_LIMIT)

      if (error) throw error
      return new Set((data as { entity_id: string }[]).map((row) => row.entity_id)).size
    },
    catch: (error) => databaseError('Failed to count the open flags', error),
  })
}

type Row = Record<string, unknown> & { id: string; deleted_at: string | null }
type Named = { name: string; slug: string }
type Titled = { title: string; slug: string }

/** A page and its edit form, unless the entity left the site */
const whenLive = (row: Row, href: string, editHref: string | null) =>
  row.deleted_at ? { href: null, editHref: null } : { href, editHref }

/** How each kind of entity is read and named: its columns, then the card they make */
const DESCRIPTIONS: Record<
  ReviewedEntityType,
  { table: string; columns: string; card: (row: Row) => EntityCard }
> = {
  subject: {
    table: 'subjects',
    columns: 'id, title, slug, deleted_at',
    card: (row) => {
      const href = subjectHref(row.slug as string)
      return {
        title: row.title as string,
        detail: null,
        ...whenLive(row, href, `${href}/modifier`),
      }
    },
  },
  public_figure: {
    table: 'public_figures',
    columns: 'id, name, slug, deleted_at',
    card: (row) => {
      const href = figureHref(row.slug as string)
      return { title: row.name as string, detail: null, ...whenLive(row, href, `${href}/modifier`) }
    },
  },
  organisation: {
    table: 'organisations',
    columns: 'id, name, slug, deleted_at',
    card: (row) => {
      const href = organisationHref(row.slug as string)
      return { title: row.name as string, detail: null, ...whenLive(row, href, `${href}/modifier`) }
    },
  },
  argument: {
    table: 'arguments',
    columns: 'id, title, slug, deleted_at',
    // An argument is renamed from the menu of its own page: it has no edit form
    card: (row) => ({
      title: row.title as string,
      detail: null,
      ...whenLive(row, argumentHref({ slug: row.slug as string }), null),
    }),
  },
  position: {
    table: 'positions',
    columns: 'id, title, slug, deleted_at, subjects!inner (title, slug)',
    card: (row) => {
      const subject = row.subjects as Titled
      const href = positionHref(subject.slug, row.slug as string)
      return {
        title: row.title as string,
        detail: `sur ${subject.title}`,
        ...whenLive(row, href, `${href}/modifier`),
      }
    },
  },
  statement: {
    table: 'statements',
    columns:
      'id, deleted_at, public_figures (name, slug), organisations (name, slug), positions!inner (title, subjects!inner (title, slug))',
    card: (row) => {
      const figure = row.public_figures as Named | null
      const organisation = row.organisations as Named | null
      const position = row.positions as { title: string; subjects: Titled }
      const author = figure
        ? { kind: 'public_figure' as const, ...figure }
        : { kind: 'organisation' as const, ...(organisation as Named) }
      return {
        title: author.name,
        detail: `pour ${position.title} · ${position.subjects.title}`,
        ...whenLive(
          row,
          authorOnSubjectHref(author, position.subjects.slug),
          statementEditHref(row.id),
        ),
      }
    },
  },
}

const describeKind = (supabase: SupabaseClient, type: ReviewedEntityType, ids: string[]) =>
  Effect.tryPromise({
    try: async () => {
      const { table, columns, card } = DESCRIPTIONS[type]
      const { data, error } = await supabase.from(table).select(columns).in('id', ids)

      if (error) throw error
      return (data as unknown as Row[]).map((row) => [row.id, card(row)] as const)
    },
    catch: (error) => databaseError(`Failed to describe the flagged ${type}s`, error),
  })

/**
 * Each flagged entity as the queue names it, by entity id: one read per
 * kind. An entity that left the site keeps its name and loses its links;
 * one the tables no longer hold at all has no entry.
 */
export function describeEntities(
  supabase: SupabaseClient,
  entities: readonly ReviewedEntity[],
): Effect.Effect<Map<string, EntityCard>, DatabaseError> {
  const idsByType = new Map<ReviewedEntityType, string[]>()
  for (const { type, id } of entities) idsByType.set(type, [...(idsByType.get(type) ?? []), id])

  return Effect.map(
    Effect.forEach(Array.from(idsByType), ([type, ids]) => describeKind(supabase, type, ids), {
      concurrency: 'unbounded',
    }),
    (kinds) => new Map(kinds.flat()),
  )
}

/**
 * The revision the review of an entity stands at, for the page that settles
 * its flags to say which ones it showed. Zero for an entity nobody reviewed:
 * unlike the other streams, a review opens with its first word.
 */
export async function reviewRevision(entityId: string): Promise<Revision> {
  const stream = reviewStream(entityId)
  const last = await getPrismaClient().domain_events.aggregate({
    where: { stream_type: stream.streamType, stream_id: stream.streamId },
    _max: { revision: true },
  })
  return last._max.revision ?? 0
}
