import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { ContributorRepository } from '../../domain/repositories/contributor-repository'
import { DatabaseError } from '../../domain/repositories/errors'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export function createContributorRepository(supabase: SupabaseClient): ContributorRepository {
  return {
    findById: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data, error } = await supabase
            .from('contributors')
            .select('id, reputation')
            .eq('id', id)
            .maybeSingle()

          if (error) throw error
          return data
            ? { id: data.id as string, reputation: (data.reputation as number) ?? 0 }
            : null
        },
        catch: (error) => dbError('Failed to find contributor', error),
      }),

    ensureExists: (id: string) =>
      Effect.tryPromise({
        try: async () => {
          const { error } = await supabase
            .from('contributors')
            .upsert({ id, reputation: 0 }, { onConflict: 'id', ignoreDuplicates: true })

          if (error) throw error
        },
        catch: (error) => dbError('Failed to ensure contributor exists', error),
      }),

    existsByEmail: (email: string) =>
      Effect.tryPromise({
        try: async () => {
          const { data } = await supabase.rpc('get_user_id_by_email', { target_email: email })
          return data !== null
        },
        catch: (error) => dbError('Failed to check if email exists', error),
      }),
  }
}
