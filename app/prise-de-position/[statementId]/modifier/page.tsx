import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { createArgumentRepository } from '../../../../infra/database/argument-repository-supabase'
import { StatementAuthor } from '../../../../domain/entities/statement'
import { canPerform } from '../../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import EditStatementForm from '../../../../components/statements/EditStatementForm'

interface PageProps {
  params: Promise<{ statementId: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une prise de position',
  description: 'Modifier une prise de position sur Débats.co.',
}

function toISODate(date: Date): string {
  return date.toISOString().split('T')[0]
}

/** The author's name and page, whoever they are */
async function describeAuthor(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  author: StatementAuthor,
): Promise<{ name: string; href: string } | null> {
  if (author.kind === 'organisation') {
    const organisation = await Effect.runPromise(
      createOrganisationRepository(supabase).findById(author.id),
    )
    return organisation ? { name: organisation.name, href: `/o/${organisation.slug}` } : null
  }
  const figure = await Effect.runPromise(createPublicFigureRepository(supabase).findById(author.id))
  return figure ? { name: figure.name, href: `/p/${figure.slug}` } : null
}

/**
 * Edits a statement from its identifier alone, whoever its author is. The
 * older route under /p/[slug]/s/[subjectSlug] stays for public figures.
 */
export default async function EditStatementByIdPage({ params }: PageProps) {
  const { statementId } = await params

  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'edit_statement')) {
    redirect('/')
  }

  const supabase = createAdminSupabaseClient()
  const statement = await Effect.runPromise(
    createStatementRepository(supabase).findById(statementId),
  )
  if (!statement) notFound()

  const positionRepo = createPositionRepository(supabase)
  const position = await Effect.runPromise(positionRepo.findById(statement.positionId))
  if (!position) notFound()

  const [subject, author, positions, initialArguments] = await Promise.all([
    Effect.runPromise(createSubjectRepository(supabase).findById(position.subjectId)),
    describeAuthor(supabase, statement.author),
    Effect.runPromise(positionRepo.findBySubjectId(position.subjectId)),
    Effect.runPromise(createArgumentRepository(supabase).findRefsByStatementId(statement.id)),
  ])
  if (!subject || !author) notFound()

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={author.href}
        backLabel={`Retour à ${author.name}`}
        title="Modifier la prise de position"
        subtitle={`${author.name} sur ${subject.title}`}
      />

      <EditStatementForm
        statementId={statement.id}
        returnHref={author.href}
        positions={positions.map((p) => ({ id: p.id, title: p.title }))}
        canUseArguments={canPerform(contributor.reputation, 'add_argument')}
        initialArguments={initialArguments}
        initialPositionId={statement.positionId}
        initialStatementType={statement.statementType}
        initialSourceName={statement.sourceName}
        initialSourceUrl={statement.sourceUrl ?? ''}
        initialQuote={statement.quote}
        initialStatedAt={toISODate(statement.statedAt)}
      />
    </ContentWithSidebar>
  )
}
