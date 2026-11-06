import { Effect } from 'effect'
import { NextResponse } from 'next/server'
import { SupabaseClient } from '@supabase/supabase-js'
import { PublicFigure } from '../../../../domain/entities/public-figure'
import {
  PublicFigureEnrichmentView,
  publicFigureEnrichmentView,
} from '../../../../domain/read-models/public-figure-enrichment'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { createOccupationRepository } from '../../../../infra/database/occupation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../../infra/database/organisation-membership-repository-supabase'

/** The figure a route works on, or the answer when there is none */
export async function figureBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<{ figure: PublicFigure } | { response: NextResponse }> {
  const found = await Effect.runPromise(
    Effect.either(createPublicFigureRepository(supabase).findBySlug(slug)),
  )
  if (found._tag === 'Left') {
    return {
      response: NextResponse.json({ error: 'Failed to load public figure' }, { status: 500 }),
    }
  }
  if (found.right === null) {
    return { response: NextResponse.json({ error: 'Public figure not found' }, { status: 404 }) }
  }
  return { figure: found.right }
}

/** The figure as the API shows her, read after a write so the caller sees what stands */
export async function figureView(
  supabase: SupabaseClient,
  figure: PublicFigure,
): Promise<{ view: PublicFigureEnrichmentView } | { response: NextResponse }> {
  const read = await Effect.runPromise(
    Effect.either(
      Effect.all({
        held: createOccupationRepository(supabase).findByPublicFigureId(figure.id),
        memberships: createOrganisationMembershipRepository(supabase).findByPublicFigureId(
          figure.id,
        ),
      }),
    ),
  )
  if (read._tag === 'Left') {
    return {
      response: NextResponse.json({ error: 'Failed to load public figure' }, { status: 500 }),
    }
  }
  return { view: publicFigureEnrichmentView(figure, read.right.held, read.right.memberships) }
}
