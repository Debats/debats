import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { getSubjectPositionsSummary } from '../../../../infra/queries/subject-positions-summary'
import { currentRevision } from '../../../../infra/events/stream-revision'
import { subjectStream } from '../../../../domain/aggregates/subject'
import { canPerform } from '../../../../domain/reputation/permissions'
import { subjectHref } from '../../../../domain/read-models/hrefs'
import { positionAuthorsCount } from '../../../../domain/read-models/subject-positions-summary'
import {
  parseMergeTarget,
  proposedFates,
  subjectMergeHref,
} from '../../../../domain/read-models/subject-merge'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import MergeTargetPicker from './MergeTargetPicker'
import MergeSubjectsForm from './MergeSubjectsForm'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ dans?: string | string[] }>
}

export const metadata: Metadata = {
  title: 'Fusionner un sujet',
  description: 'Fusionner un sujet en doublon dans un autre sujet de Débats.co.',
  robots: { index: false },
}

/**
 * Merges the subject of the address into another: first the subject that
 * remains is chosen (`?dans=`), then what becomes of each position.
 */
export default async function MergeSubjectPage({ params, searchParams }: PageProps) {
  const [{ slug }, { dans }] = await Promise.all([params, searchParams])

  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'merge_subjects')) {
    redirect(subjectHref(slug))
  }

  const supabase = createAdminSupabaseClient()
  const subjects = createSubjectRepository(supabase)
  const positions = createPositionRepository(supabase)

  const targetSlug = parseMergeTarget(dans, slug)
  const [absorbed, kept] = await Promise.all([
    Effect.runPromise(subjects.findBySlug(slug)),
    targetSlug ? Effect.runPromise(subjects.findBySlug(targetSlug)) : null,
  ])
  if (!absorbed) notFound()

  const header = (
    <FormPageHeader
      backHref={subjectHref(slug)}
      backLabel="Retour au sujet"
      title="Fusionner le sujet"
      subtitle={absorbed.title}
    />
  )

  if (!kept) {
    return (
      <ContentWithSidebar topMargin>
        {header}
        <MergeTargetPicker subjectId={absorbed.id} subjectSlug={absorbed.slug} />
      </ContentWithSidebar>
    )
  }

  const [absorbedPositions, keptPositions, voices, absorbedRevision, keptRevision] =
    await Promise.all([
      Effect.runPromise(positions.findBySubjectId(absorbed.id)),
      Effect.runPromise(positions.findBySubjectId(kept.id)),
      Effect.runPromise(getSubjectPositionsSummary(supabase, absorbed.id)),
      currentRevision(subjectStream(absorbed.id)),
      currentRevision(subjectStream(kept.id)),
    ])
  const voicesOn = new Map(voices.map((p) => [p.positionId, positionAuthorsCount(p)]))

  return (
    <ContentWithSidebar topMargin>
      {header}
      <MergeSubjectsForm
        absorbed={{ id: absorbed.id, title: absorbed.title, revision: absorbedRevision }}
        kept={{ id: kept.id, title: kept.title, revision: keptRevision }}
        positions={absorbedPositions.map((p) => ({
          id: p.id,
          title: p.title,
          voices: voicesOn.get(p.id) ?? 0,
        }))}
        keptPositions={keptPositions.map((p) => ({ id: p.id, title: p.title }))}
        proposed={proposedFates(absorbedPositions, keptPositions)}
        otherTargetHref={subjectMergeHref(absorbed.slug)}
      />
    </ContentWithSidebar>
  )
}
