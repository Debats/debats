'use server'

import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { findJudgedPairs } from '../../infra/queries/position-judgements'
import { authorRefOf } from '../../lib/forms/author-ref'
import { JudgedPair } from '../../domain/read-models/position-judgements'
import { TakenPosition, takenPositions } from '../../domain/read-models/stance-question'

export interface TakenOnSubject {
  /** The positions the author already took on the subject */
  taken: TakenPosition[]
  /** What was judged between the positions of the subject */
  judged: JudgedPair[]
}

const NOTHING: TakenOnSubject = { taken: [], judged: [] }

/**
 * What the statement form needs to know whether a question is due: the
 * positions its author already took on its subject, and the pairs already
 * judged there. An author who never spoke on the subject costs one read.
 */
export async function getTakenPositions(
  author: { kind: string; id: string },
  subjectId: string,
): Promise<TakenOnSubject> {
  const whose = authorRefOf(author)
  if (!whose || typeof subjectId !== 'string' || !subjectId) return NOTHING

  const supabase = createAdminSupabaseClient()
  const statements = await Effect.runPromise(
    createStatementRepository(supabase).findByAuthorAndSubjectIds(whose, [subjectId]),
  )
  if (statements.length === 0) return NOTHING

  const judged = await Effect.runPromise(findJudgedPairs(supabase, [subjectId]))
  return { taken: takenPositions(statements), judged }
}
