'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { mergePositions } from '../../domain/use-cases/merge-positions'
import { getAdminContributor } from './admin-guard'
import type { ActionResult } from './validate-draft-action'

export async function mergePositionsAction(
  sourcePositionId: string,
  targetPositionId: string,
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
    positionRepo: createPositionRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
