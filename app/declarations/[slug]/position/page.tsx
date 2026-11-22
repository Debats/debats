import { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { loadJointDeclarationPage } from '../../../../infra/queries/joint-declarations'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import { jointDeclarationHref } from '../../../../domain/read-models/hrefs'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import TakeJointPositionForm from './TakeJointPositionForm'

export const metadata: Metadata = {
  title: 'Ajouter une position à une déclaration commune',
  robots: { index: false },
}

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function TakeJointPositionPage({ params }: PageProps) {
  const { slug } = await params
  const [page, contributor] = await Promise.all([
    Effect.runPromise(loadJointDeclarationPage(createAdminSupabaseClient(), slug)),
    getAuthenticatedContributor(),
  ])
  if (!page) notFound()

  const href = jointDeclarationHref(page.declaration)
  if (!contributor || !canPerform(contributor.reputation, 'add_joint_declaration')) {
    redirect(href)
  }

  return (
    <ContentWithSidebar topMargin hideLatestStatements>
      <FormPageHeader
        backHref={href}
        backLabel={page.declaration.title}
        title="Le texte prend une autre position"
        subtitle="Un sujet de plus que le texte engage, avec les mots qui l’énoncent"
      />
      <TakeJointPositionForm
        declarationId={page.declaration.id}
        backHref={href}
        signatories={page.signatories.length}
      />
    </ContentWithSidebar>
  )
}
