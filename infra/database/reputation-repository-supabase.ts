import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/subject-repository'
import { ReputationRepository } from '../../domain/repositories/reputation-repository'

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
        catch: (error) => new DatabaseError(`Failed to get reputation: ${error}`),
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
        catch: (error) => new DatabaseError(`Failed to update reputation: ${error}`),
      }),
  }
}
