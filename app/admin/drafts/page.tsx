import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createDraftStatementRepository } from '../../../infra/database/draft-statement-repository-supabase'
import { liveServices } from '../../../infra/live-services'
import { resolveDraft } from '../../../domain/use-cases/resolve-draft'
import {
  DraftsParams,
  draftGroupingAllLabel,
  draftsViewHref,
  parseDraftsView,
} from '../../../domain/read-models/drafts-view'
import { getAdminContributor } from '../../actions/admin-guard'
import DraftGroups from './DraftGroups'
import DraftList from './DraftList'
import styles from './admin-drafts.module.css'

export const metadata: Metadata = {
  title: 'Brouillons',
  robots: { index: false, follow: false },
}

interface Props {
  searchParams: Promise<DraftsParams>
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
  const view = parseDraftsView(await searchParams)

  if (!view.group) {
    const groups = await Effect.runPromise(draftRepo.countPendingGroups(view.grouping))

    return (
      <div className={styles.container}>
        <h1 className={styles.title}>BROUILLONS EN ATTENTE</h1>
        <DraftGroups grouping={view.grouping} groups={groups} />
      </div>
    )
  }

  const services = liveServices(supabase)
  const drafts = await Effect.runPromise(draftRepo.findPendingInGroup(view.grouping, view.group))

  const draftsWithResolution = await Promise.all(
    drafts.map(async (draft) => {
      const resolution = await Effect.runPromise(Effect.provide(resolveDraft(draft), services))
      return { draft, resolution }
    }),
  )

  return (
    <div className={styles.container}>
      <Link href={draftsViewHref({ grouping: view.grouping })} className={styles.backLink}>
        ← {draftGroupingAllLabel(view.grouping)}
      </Link>
      <h1 className={styles.title}>{view.group}</h1>

      {draftsWithResolution.length === 0 ? (
        <p className={styles.empty}>Aucun brouillon en attente ici.</p>
      ) : (
        <DraftList drafts={draftsWithResolution} view={view} />
      )}
    </div>
  )
}
