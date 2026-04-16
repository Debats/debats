import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createThemeRepository } from '../../../../infra/database/theme-repository-supabase'
import { createRelatedSubjectsRepository } from '../../../../infra/database/related-subjects-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import EditSubjectTabs from './EditSubjectTabs'

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
  const themeRepo = createThemeRepository(supabase)
  const relatedRepo = createRelatedSubjectsRepository(supabase)

  const [subject, allThemes] = await Promise.all([
    Effect.runPromise(subjectRepo.findBySlug(slug)),
    Effect.runPromise(themeRepo.findAll()),
  ])

  if (!subject) notFound()

  const [themeAssignments, relatedSubjects] = await Promise.all([
    Effect.runPromise(themeRepo.findAssignmentsBySubjectId(subject.id)),
    Effect.runPromise(relatedRepo.findRelated(subject.id)),
  ])

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/s/${slug}`}
        backLabel="Retour au sujet"
        title="Modifier le sujet"
        subtitle={subject.title}
      />

      <EditSubjectTabs
        subjectId={subject.id}
        subjectSlug={subject.slug}
        subject={{
          title: subject.title,
          presentation: subject.presentation,
          problem: subject.problem,
        }}
        availableThemes={allThemes.map((t) => ({ id: t.id, name: t.name }))}
        selectedThemeIds={themeAssignments.map((a) => a.theme.id)}
        primaryThemeId={themeAssignments.find((a) => a.isPrimary)?.theme.id ?? null}
        relatedSubjects={relatedSubjects.map((s) => ({
          id: s.id,
          title: s.title,
          slug: s.slug,
        }))}
      />
    </ContentWithSidebar>
  )
}
