import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { ReputationRepository } from '../../domain/repositories/reputation-repository'
import {
  type ReputationEvent,
  type RelatedEntityType,
} from '../../domain/entities/reputation-event'
import { type RewardableAction } from '../../domain/reputation/permissions'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export function createReputationRepository(supabase: SupabaseClient): ReputationRepository {
  return {
    getReputation: (contributorId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('contributors')
            .select('reputation')
            .eq('id', contributorId)
            .single()

          if (error) throw error
          return data.reputation
        },
        catch: (error) => dbError('Failed to get reputation', error),
      }),

    recordEvent: (event) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase.from('reputation_events').insert({
            contributor_id: event.contributorId,
            action: event.action,
            amount: event.amount,
            related_entity_type: event.relatedEntityType ?? null,
            related_entity_id: event.relatedEntityId ?? null,
          })

          if (error) throw error
        },
        catch: (error) => dbError('Failed to record reputation event', error),
      }),

    getHistory: (contributorId: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('reputation_events')
            .select('*')
            .eq('contributor_id', contributorId)
            .order('created_at', { ascending: false })

          if (error) throw error

          return data.map(
            (row): ReputationEvent => ({
              id: row.id,
              contributorId: row.contributor_id,
              action: row.action as RewardableAction,
              amount: row.amount,
              relatedEntityType: (row.related_entity_type as RelatedEntityType) ?? undefined,
              relatedEntityId: row.related_entity_id ?? undefined,
              createdAt: new Date(row.created_at),
            }),
          )
        },
        catch: (error) => dbError('Failed to get reputation history', error),
      }),
  }
}
