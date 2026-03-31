import { Metadata } from 'next'
import Link from 'next/link'
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

interface Props {
  searchParams: Promise<{ subject?: string }>
}

export default async function AdminDraftsPage({ searchParams }: Props) {
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
  const { subject } = await searchParams

  if (!subject) {
    const subjectCounts = await Effect.runPromise(draftRepo.countPendingBySubject())
    const total = subjectCounts.reduce((sum, s) => sum + s.count, 0)

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>BROUILLONS EN ATTENTE</h1>

        {subjectCounts.length === 0 ? (
          <p className={styles.empty}>Aucun brouillon en attente de validation.</p>
        ) : (
          <>
            <p className={styles.total}>
              {total} brouillon{total > 1 ? 's' : ''} en attente
            </p>
            <ul className={styles.subjectList}>
              {subjectCounts.map(({ subjectTitle, count }) => (
                <li key={subjectTitle}>
                  <Link
                    href={`/admin/drafts?subject=${encodeURIComponent(subjectTitle)}`}
                    className={styles.subjectLink}
                  >
                    {subjectTitle}
                    <span className={styles.subjectCount}>{count}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    )
  }

  const publicFigureRepo = createPublicFigureRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)
  const positionRepo = createPositionRepository(supabase)

  const drafts = await Effect.runPromise(draftRepo.findPendingBySubject(subject))

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
      <Link href="/admin/drafts" className={styles.backLink}>
        ← Tous les sujets
      </Link>
      <h1 className={styles.title}>{subject}</h1>

      {draftsWithResolution.length === 0 ? (
        <p className={styles.empty}>Aucun brouillon en attente pour ce sujet.</p>
      ) : (
        <DraftList drafts={draftsWithResolution} />
      )}
    </div>
  )
}
