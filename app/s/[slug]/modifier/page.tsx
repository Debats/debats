import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import EditSubjectForm from '../../../../components/subjects/EditSubjectForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Modifier un sujet',
  description: 'Modifier un sujet de débat sur Débats.co.',
}

export default async function EditSubjectPage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_subject')) {
    redirect('/s')
  }

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) notFound()

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/s/${slug}`}
        backLabel="Retour au sujet"
        title="Modifier le sujet"
        subtitle={subject.title}
      />

      <EditSubjectForm
        subjectId={subject.id}
        subjectSlug={subject.slug}
        initialTitle={subject.title}
        initialPresentation={subject.presentation}
        initialProblem={subject.problem}
      />
    </ContentWithSidebar>
  )
}
