'use server'

import { Either } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../infra/database/draft-statement-repository-supabase'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../infra/database/position-repository-supabase'
import { runUnitOfWork } from '../../infra/events/unit-of-work'
import { createPublicFigureSource, createSubjectSource } from '../../infra/events/sources'
import { createArgumentRepository } from '../../infra/database/argument-repository-supabase'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../infra/database/organisation-membership-repository-supabase'
import { createWikipediaValidator } from '../../infra/wikipedia/wikipedia-validator'
import { validateDraft } from '../../domain/use-cases/validate-draft'
import { getAuthenticatedContributor } from './get-authenticated-contributor'

export type ActionResult = { success: true } | { success: false; error: string }

export async function validateDraftAction(draftId: string): Promise<ActionResult> {
  const supabase = createAdminSupabaseClient()
  const contributor = await getAuthenticatedContributor()

  const result = await validateDraft({
    draftId,
    contributor,
    draftRepo: createDraftStatementRepository(supabase),
    publicFigureRepo: createPublicFigureRepository(supabase),
    organisationRepo: createOrganisationRepository(supabase),
    subjectRepo: createSubjectRepository(supabase),
    positionRepo: createPositionRepository(supabase),
    runUnitOfWork,
    subjectSource: createSubjectSource(supabase),
    publicFigureSource: createPublicFigureSource(supabase),
    argumentRepo: createArgumentRepository(supabase),
    occupationRepo: createOccupationRepository(supabase),
    membershipRepo: createOrganisationMembershipRepository(supabase),
    wikipediaValidator: createWikipediaValidator(),
  })

  if (Either.isLeft(result)) {
    return { success: false, error: result.left }
  }

  return { success: true }
}
