import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../../../../infra/supabase/ssr'
import { createSubjectRepository } from '../../../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../../../infra/database/position-repository-supabase'
import { getAuthenticatedContributor } from '../../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../../../components/layout/FormPageHeader'
import ErrorDisplay from '../../../../../../components/layout/ErrorDisplay'
import EditPositionForm from '../../../../../../components/positions/EditPositionForm'

interface PageProps {
  params: Promise<{ slug: string; positionId: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une position',
  description: 'Modifier une position sur Débats.co.',
}

export default async function EditPositionPage({ params }: PageProps) {
  const { slug, positionId } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_position')) {
    redirect(`/s/${slug}`)
  }

  try {
    const supabase = await createSSRSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const positionRepo = createPositionRepository(supabase)

    const [subject, position] = await Promise.all([
      Effect.runPromise(subjectRepo.findBySlug(slug)),
      Effect.runPromise(positionRepo.findById(positionId)),
    ])

    if (!subject) notFound()
    if (!position) notFound()
    if (position.subjectId !== subject.id) notFound()

    const returnHref = `/s/${slug}/position/${positionId}`

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
          returnHref={returnHref}
          initialTitle={position.title}
          initialDescription={position.description}
        />
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger la position."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
