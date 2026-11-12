import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../../../infra/database/position-repository-supabase'
import { getAuthenticatedContributor } from '../../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../../domain/reputation/permissions'
import { subjectStream } from '../../../../../../domain/aggregates/subject'
import { positionHref, subjectHref } from '../../../../../../domain/read-models/hrefs'
import { currentRevision } from '../../../../../../infra/events/stream-revision'
import { reviewToEdit } from '../../../../../review-of'
import ContentWithSidebar from '../../../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../../../components/layout/FormPageHeader'
import EditPositionForm from '../../../../../../components/positions/EditPositionForm'

interface PageProps {
  params: Promise<{ slug: string; positionSlug: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une position',
  description: 'Modifier une position sur Débats.co.',
}

export default async function EditPositionPage({ params }: PageProps) {
  const { slug, positionSlug } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_position')) {
    redirect(subjectHref(slug))
  }

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const positionRepo = createPositionRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
  if (!subject) notFound()

  const position = await Effect.runPromise(
    positionRepo.findBySubjectAndSlug(subject.id, positionSlug),
  )
  if (!position) notFound()

  // A position lives in its subject's stream: that is the revision the form edits
  const revision = await currentRevision(subjectStream(subject.id))
  const returnHref = positionHref(slug, positionSlug)
  const review = await reviewToEdit(supabase, { type: 'position', id: position.id }, contributor.id)

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={returnHref}
        backLabel="Retour à la position"
        title="Modifier la position"
        subtitle={`${position.title} — ${subject.title}`}
      />

      <EditPositionForm
        positionId={position.id}
        revision={revision}
        review={review}
        returnHref={returnHref}
        initialTitle={position.title}
        initialDescription={position.description}
      />
    </ContentWithSidebar>
  )
}
