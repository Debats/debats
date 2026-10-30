import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import {
  AUTHOR_TAB_LABELS,
  AuthorTab,
  authorTabHref,
} from '../../../domain/read-models/author-tabs'

/** The metadata of an organisation page, each tab with its own title and canonical address */
export async function organisationMetadata(slug: string, tab: AuthorTab): Promise<Metadata> {
  try {
    const supabase = createAdminSupabaseClient()
    const organisation = await Effect.runPromise(
      createOrganisationRepository(supabase).findBySlug(slug),
    )
    if (!organisation) return { title: 'Organisation introuvable' }
    const description = `${organisation.name} - ${organisation.presentation}`
    const url = authorTabHref(`/o/${slug}`, tab)
    const title =
      tab === 'statements' ? organisation.name : `${organisation.name} — ${AUTHOR_TAB_LABELS[tab]}`
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: 'profile', url },
      twitter: { card: 'summary_large_image', title, description },
    }
  } catch {
    return { title: 'Organisation' }
  }
}
