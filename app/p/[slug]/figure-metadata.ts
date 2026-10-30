import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import {
  AUTHOR_TAB_LABELS,
  AuthorTab,
  authorTabHref,
} from '../../../domain/read-models/author-tabs'

/** The metadata of a public figure page, each tab with its own title and canonical address */
export async function figureMetadata(slug: string, tab: AuthorTab): Promise<Metadata> {
  try {
    const supabase = createAdminSupabaseClient()
    const figure = await Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug))
    if (!figure) return { title: 'Personnalité introuvable' }
    const description = figure.presentation
      ? `${figure.name} - ${figure.presentation}`
      : `Positions et prises de position de ${figure.name} sur les sujets de société.`
    const url = authorTabHref(`/p/${slug}`, tab)
    const title = tab === 'statements' ? figure.name : `${figure.name} — ${AUTHOR_TAB_LABELS[tab]}`
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: { title, description, type: 'profile', url },
      twitter: { card: 'summary_large_image', title, description },
    }
  } catch {
    return { title: 'Personnalité' }
  }
}
