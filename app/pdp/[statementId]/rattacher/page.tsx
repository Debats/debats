import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { createPositionRepository } from '../../../../infra/database/position-repository-supabase'
import { createSubjectRepository } from '../../../../infra/database/subject-repository-supabase'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { contentLine } from '../../../../domain/entities/statement'
import { jointDeclarationHref, statementEditHref } from '../../../../domain/read-models/hrefs'
import { canPerform } from '../../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import AttachStatementForm from './AttachStatementForm'

export const metadata: Metadata = {
  title: 'Rattacher une prise de position à une déclaration commune',
  robots: { index: false },
}

interface PageProps {
  params: Promise<{ statementId: string }>
}

/**
 * Says that a statement already on the site is its author's signature of a
 * joint declaration: recorded before the site knew the text, as a deed or as
 * words of the author's own.
 */
export default async function AttachStatementPage({ params }: PageProps) {
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
  // Already a signature: there is nothing left to attach, its text says so
  if (statement.jointDeclaration) redirect(jointDeclarationHref(statement.jointDeclaration))

  const position = await Effect.runPromise(
    createPositionRepository(supabase).findById(statement.positionId),
  )
  if (!position) notFound()

  const [subject, authorName] = await Promise.all([
    Effect.runPromise(createSubjectRepository(supabase).findById(position.subjectId)),
    statement.author.kind === 'organisation'
      ? Effect.runPromise(
          createOrganisationRepository(supabase).findById(statement.author.id),
        ).then((organisation) => organisation?.name)
      : Effect.runPromise(
          createPublicFigureRepository(supabase).findById(statement.author.id),
        ).then((figure) => figure?.name),
  ])
  if (!subject || !authorName) notFound()

  const backHref = statementEditHref(statement.id)

  return (
    <ContentWithSidebar topMargin hideLatestStatements>
      <FormPageHeader
        backHref={backHref}
        backLabel="Retour à la prise de position"
        title="Rattacher à une déclaration commune"
        subtitle={`${authorName} sur ${subject.title}`}
      />
      <AttachStatementForm
        statement={{
          id: statement.id,
          authorName,
          subjectTitle: subject.title,
          positionTitle: position.title,
          summary: contentLine(statement.content),
          sourceName: statement.sourceName,
        }}
        backHref={backHref}
      />
    </ContentWithSidebar>
  )
}
