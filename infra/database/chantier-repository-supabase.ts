import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { Chantier, ChantierMessage, isChantierStatus } from '../../domain/entities/chantier'
import {
  ChantierRepository,
  ChantierUpdate,
  NewChantier,
  NewChantierMessage,
} from '../../domain/repositories/chantier-repository'
import { DatabaseError } from '../../domain/repositories/errors'
import { AgentSpend } from '../../domain/services/chantier-budget'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

/** The two columns are set and null together: the table says so */
function spendKept(row: Record<string, unknown>): AgentSpend | null {
  return typeof row.spent_cents === 'number' && typeof row.cap_cents === 'number'
    ? { spentCents: row.spent_cents, capCents: row.cap_cents }
    : null
}

function mapChantier(row: Record<string, unknown>): Chantier {
  const status = row.status as string
  if (!isChantierStatus(status)) throw new Error(`Unknown chantier status « ${status} »`)
  return {
    id: row.id as string,
    brief: row.brief as string,
    title: (row.title as string) ?? null,
    status,
    sessionId: (row.session_id as string) ?? null,
    lastEventAt: (row.last_event_at as string) ?? null,
    sections: (row.sections as string[]) ?? [],
    spend: spendKept(row),
    createdBy: row.created_by as string,
    updatedBy: row.updated_by as string,
    createdAt: new Date(row.created_at as string),
    updatedAt: new Date(row.updated_at as string),
  }
}

function mapMessage(row: Record<string, unknown>): ChantierMessage {
  return {
    id: row.id as string,
    chantierId: row.chantier_id as string,
    role: row.role as ChantierMessage['role'],
    text: row.text as string,
    eventId: (row.event_id as string) ?? null,
    createdAt: new Date(row.created_at as string),
  }
}

/** The columns an update touches: only what was given, named as the table names it */
function updateColumns(fields: ChantierUpdate, updatedBy: string): Record<string, unknown> {
  return {
    ...(fields.title !== undefined ? { title: fields.title } : {}),
    ...(fields.status !== undefined ? { status: fields.status } : {}),
    ...(fields.sessionId !== undefined ? { session_id: fields.sessionId } : {}),
    ...(fields.lastEventAt !== undefined ? { last_event_at: fields.lastEventAt } : {}),
    ...(fields.sections !== undefined ? { sections: fields.sections } : {}),
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  }
}

export function createChantierRepository(supabase: SupabaseClient): ChantierRepository {
  return {
    create: (chantier: NewChantier) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantiers')
            .insert({
              brief: chantier.brief,
              title: chantier.title ?? null,
              status: chantier.status ?? 'working',
              created_by: chantier.createdBy,
              updated_by: chantier.createdBy,
            })
            .select()
            .single()
          if (error) throw error
          return mapChantier(data)
        },
        catch: (error) => dbError('Failed to create chantier', error),
      }),

    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantiers')
            .select('*')
            .eq('id', id)
            .maybeSingle()
          if (error) throw error
          return data ? mapChantier(data) : null
        },
        catch: (error) => dbError('Failed to fetch chantier', error),
      }),

    findAll: () =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantiers')
            .select('*')
            .order('updated_at', { ascending: false })
          if (error) throw error
          return data.map(mapChantier)
        },
        catch: (error) => dbError('Failed to fetch chantiers', error),
      }),

    update: (id: string, fields: ChantierUpdate, updatedBy: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantiers')
            .update(updateColumns(fields, updatedBy))
            .eq('id', id)
            .select()
            .maybeSingle()
          if (error) throw error
          return data ? mapChantier(data) : null
        },
        catch: (error) => dbError('Failed to update chantier', error),
      }),

    addMessages: (chantierId: string, messages: NewChantierMessage[]) =>
      Effect.tryPromise({
        try: async () => {
          if (messages.length === 0) return []
          /* A message that mirrors an event already mirrored is left as it is */
          const { data, error } = await supabase
            .from('chantier_messages')
            .upsert(
              messages.map((message) => ({
                chantier_id: chantierId,
                role: message.role,
                text: message.text,
                event_id: message.eventId,
              })),
              { onConflict: 'event_id', ignoreDuplicates: true },
            )
            .select()
          if (error) throw error
          return data.map(mapMessage)
        },
        catch: (error) => dbError('Failed to add chantier messages', error),
      }),

    findMessages: (chantierId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantier_messages')
            .select('*')
            .eq('chantier_id', chantierId)
            .order('created_at', { ascending: true })
          if (error) throw error
          return data.map(mapMessage)
        },
        catch: (error) => dbError('Failed to fetch chantier messages', error),
      }),

    keepUnheard: (chantierId: string, text: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('chantier_unheard_notices')
            .insert({ chantier_id: chantierId, text })
          if (error) throw error
        },
        catch: (error) => dbError('Failed to keep an unheard chantier notice', error),
      }),

    findUnheard: (chantierId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('chantier_unheard_notices')
            .select('id, text')
            .eq('chantier_id', chantierId)
            .order('created_at', { ascending: true })
          if (error) throw error
          return data.map((row) => ({ id: row.id as string, text: row.text as string }))
        },
        catch: (error) => dbError('Failed to fetch unheard chantier notices', error),
      }),

    forgetUnheard: (ids: readonly string[]) =>
      Effect.tryPromise({
        try: async () => {
          if (ids.length === 0) return
          const { error } = await supabase
            .from('chantier_unheard_notices')
            .delete()
            .in('id', [...ids])
          if (error) throw error
        },
        catch: (error) => dbError('Failed to forget unheard chantier notices', error),
      }),

    /* Neither updated_at nor updated_by: nobody edited the chantier, and the list is ordered by its last touch */
    keepSpend: (id: string, { spentCents, capCents }: AgentSpend) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('chantiers')
            .update({ spent_cents: spentCents, cap_cents: capCents })
            .eq('id', id)
          if (error) throw error
        },
        catch: (error) => dbError('Failed to keep chantier spend', error),
      }),

    /* The drafts go first, by hand: their key only unlinks on delete; the messages cascade */
    delete: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const drafts = await supabase.from('draft_statements').delete().eq('chantier_id', id)
          if (drafts.error) throw drafts.error
          const chantier = await supabase.from('chantiers').delete().eq('id', id)
          if (chantier.error) throw chantier.error
        },
        catch: (error) => dbError('Failed to delete chantier', error),
      }),
  }
}
