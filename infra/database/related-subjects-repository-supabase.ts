import * as Sentry from '@sentry/nextjs'
import { Effect } from 'effect'
import { SupabaseClient } from '@supabase/supabase-js'
import { DatabaseError } from '../../domain/repositories/errors'
import { RelatedSubjectsRepository } from '../../domain/repositories/related-subjects-repository'
import { mapRowToEntity } from './subject-repository-supabase'

function dbError(message: string, error: unknown): DatabaseError {
  const msg = `${message}: ${error instanceof Error ? error.message : JSON.stringify(error)}`
  Sentry.captureException(error, { extra: { message } })
  return new DatabaseError(msg)
}

export function createRelatedSubjectsRepository(
  supabase: SupabaseClient,
): RelatedSubjectsRepository {
  return {
    findRelated: (subjectId: string) =>
      Effect.tryPromise({
        try: async () => {
          const [asFirst, asSecond] = await Promise.all([
            supabase.from('related_subjects').select('subject_id_2').eq('subject_id_1', subjectId),
            supabase.from('related_subjects').select('subject_id_1').eq('subject_id_2', subjectId),
          ])

          if (asFirst.error) throw asFirst.error
          if (asSecond.error) throw asSecond.error

          const relatedIds = [
            ...asFirst.data.map((l) => l.subject_id_2),
            ...asSecond.data.map((l) => l.subject_id_1),
          ]

          if (relatedIds.length === 0) return []

          const { data, error } = await supabase
            .from('subjects')
            .select('*')
            .in('id', relatedIds)
            .is('deleted_at', null)
            .order('title')

          if (error) throw error
          return data.map(mapRowToEntity)
        },
        catch: (error) => dbError('Failed to fetch related subjects', error),
      }),
  }
}
