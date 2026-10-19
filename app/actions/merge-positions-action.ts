'use server'

import { redirect } from 'next/navigation'
import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createStatementSource, createSubjectSource } from '../../infra/events/sources'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { mergePositions } from '../../domain/use-cases/merge-positions'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

export async function mergePositionsAction(
  sourcePositionId: string,
  targetPositionId: string,
  subjectSlug: string,
): Promise<ActionResult> {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return { success: false, error: 'Accès refusé.' }
  }

  const supabase = createAdminSupabaseClient()

  const result = await mergePositions({
    sourcePositionId,
    targetPositionId,
    contributor: { id: contributor.id, reputation: contributor.reputation },
    runUnitOfWork,
    subjectSource: createSubjectSource(supabase),
    statementSource: createStatementSource(supabase),
    positionRepo: createPositionRepository(supabase),
    statementRepo: createStatementRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  redirect(`/s/${subjectSlug}/position/${targetPositionId}`)
}
