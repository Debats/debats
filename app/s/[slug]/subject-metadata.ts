import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { SubjectTab, subjectTabHref, SUBJECT_TAB_LABELS } from './SubjectTabs'

/** The metadata of a subject page, each tab with its own title and canonical address */
export async function subjectMetadata(slug: string, tab: SubjectTab): Promise<Metadata> {
  try {
    const supabase = createAdminSupabaseClient()
    const subject = await Effect.runPromise(createSubjectRepository(supabase).findBySlug(slug))
    if (!subject) return { title: 'Sujet introuvable' }
    const url = subjectTabHref(slug, tab)
    const title =
      tab === 'positions' ? subject.title : `${subject.title} — ${SUBJECT_TAB_LABELS[tab]}`
    return {
      title,
      description: subject.presentation,
      alternates: { canonical: url },
      openGraph: { title, description: subject.presentation, type: 'article', url },
      twitter: { card: 'summary_large_image', title, description: subject.presentation },
    }
  } catch {
    return { title: 'Sujet' }
  }
}
