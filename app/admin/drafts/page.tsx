import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../infra/database/position-repository-supabase'
import { resolveDraft } from '../../../domain/use-cases/resolve-draft'
import { getAdminContributor } from '../../actions/admin-guard'
import DraftList from './DraftList'
import styles from './admin-drafts.module.css'

export const metadata: Metadata = {
  title: 'Brouillons',
  robots: { index: false, follow: false },
}

export default async function AdminDraftsPage() {
  const contributor = await getAdminContributor()
  if (!contributor) {
    return (
      <div className={styles.container}>
        <p className={styles.accessDenied}>Accès refusé.</p>
      </div>
    )
  }

  const supabase = createAdminSupabaseClient()
  const draftRepo = createDraftStatementRepository(supabase)
  const publicFigureRepo = createPublicFigureRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)
  const positionRepo = createPositionRepository(supabase)

  const drafts = await Effect.runPromise(draftRepo.findByStatus('pending'))

  const draftsWithResolution = await Promise.all(
    drafts.map(async (draft) => {
      const resolution = await Effect.runPromise(
        resolveDraft(draft, { publicFigureRepo, subjectRepo, positionRepo }),
      )
      return { draft, resolution }
    }),
  )

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>BROUILLONS EN ATTENTE</h1>

      {draftsWithResolution.length === 0 ? (
        <p className={styles.empty}>Aucun brouillon en attente de validation.</p>
      ) : (
        <DraftList drafts={draftsWithResolution} />
      )}
    </div>
  )
}
