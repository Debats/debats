'use server'

import { Either } from 'effect'
import { revalidatePath } from 'next/cache'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPublicFigureSource } from '../../infra/events/sources'
import { createOrganisationMembershipRepository } from '../../infra/database/organisation-membership-repository-supabase'
import { removeOrganisationMembershipUseCase } from '../../domain/use-cases/remove-organisation-membership'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function removeOrganisationMembershipAction(
  membershipId: string,
  organisationSlug: string,
): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await removeOrganisationMembershipUseCase({
    contributor,
    membershipId,
    runUnitOfWork,
    publicFigureSource: createPublicFigureSource(supabase),
    membershipRepo: createOrganisationMembershipRepository(supabase),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  revalidatePath(`/o/${organisationSlug}`)
  return { success: true }
}
