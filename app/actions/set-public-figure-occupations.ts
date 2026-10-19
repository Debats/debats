'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPublicFigureSource } from '../../infra/events/sources'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { OccupationAssignmentInput } from '../../domain/read-models/occupations'
import { setPublicFigureOccupationsUseCase } from '../../domain/use-cases/set-public-figure-occupations'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type SetOccupationsResult = { success: true } | { success: false; error: string }

export async function setPublicFigureOccupationsAction(
  publicFigureId: string,
  publicFigureSlug: string,
  assignments: OccupationAssignmentInput[],
): Promise<SetOccupationsResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await setPublicFigureOccupationsUseCase({
    contributor,
    publicFigureId,
    assignments,
    runUnitOfWork,
    publicFigureSource: createPublicFigureSource(supabase),
    occupationRepo: createOccupationRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath(`/p/${publicFigureSlug}`)
  return { success: true }
}
