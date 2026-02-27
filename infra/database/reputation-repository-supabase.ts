import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { ReputationRepository } from '../../domain/repositories/reputation-repository'

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

    addReputation: (contributorId: string, amount: number) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error: fetchError } = await supabase
            .from('contributors')
            .select('reputation')
            .eq('id', contributorId)
            .single()

          if (fetchError) throw fetchError

          const { error: updateError } = await supabase
            .from('contributors')
            .update({ reputation: data.reputation + amount })
            .eq('id', contributorId)

          if (updateError) throw updateError
        },
        catch: (error) => dbError('Failed to update reputation', error),
      }),
  }
}
