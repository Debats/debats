import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../../../../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../../../../../../infra/database/position-repository-supabase'
import { getAuthenticatedContributor } from '../../../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../../../../components/layout/FormPageHeader'
import ErrorDisplay from '../../../../../../../components/layout/ErrorDisplay'
import EditStatementForm from '../../../../../../../components/statements/EditStatementForm'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string; statementId: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une prise de position',
  description: 'Modifier une prise de position sur Débats.co.',
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

export default async function EditStatementPage({ params }: PageProps) {
  const { slug, subjectSlug, statementId } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_statement')) {
    redirect(`/p/${slug}/s/${subjectSlug}`)
  }

  try {
    const supabase = await createSSRSupabaseClient()
    const figureRepo = createPublicFigureRepository(supabase)
    const subjectRepo = createSubjectRepository(supabase)
    const statementRepo = createStatementRepository(supabase)
    const positionRepo = createPositionRepository(supabase)

    const [figure, subject, statement] = await Promise.all([
      Effect.runPromise(figureRepo.findBySlug(slug)),
      Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
      Effect.runPromise(statementRepo.findById(statementId)),
    ])

    if (!figure || !subject) notFound()
    if (!statement) notFound()
    if (statement.publicFigureId !== figure.id) notFound()

    const positions = await Effect.runPromise(positionRepo.findBySubjectId(subject.id))
    const returnHref = `/p/${slug}/s/${subjectSlug}`

    return (
      <ContentWithSidebar topMargin>
        <FormPageHeader
          backHref={returnHref}
          backLabel="Retour"
          title="Modifier la prise de position"
          subtitle={`${figure.name} sur ${subject.title}`}
        />

        <EditStatementForm
          statementId={statement.id}
          returnHref={returnHref}
          positions={positions.map((p) => ({ id: p.id, title: p.title }))}
          initialPositionId={statement.positionId}
          initialSourceName={statement.sourceName}
          initialSourceUrl={statement.sourceUrl ?? ''}
          initialQuote={statement.quote}
          initialStatedAt={toISODate(statement.statedAt)}
        />
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger la prise de position."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
