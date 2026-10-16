import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import AffiliateFigureForm from './AffiliateFigureForm'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Affilier à une organisation',
  description: 'Relier une personnalité à une organisation sur Débats.co.',
}

/** The figure's side of the affiliation: pick the organisation she belongs to. */
export default async function AffiliateFigurePage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()
  if (!contributor || !canPerform(contributor.reputation, 'add_membership')) {
    redirect(`/p/${slug}`)
  }

  const supabase = createAdminSupabaseClient()
  const figure = await Effect.runPromise(createPublicFigureRepository(supabase).findBySlug(slug))
  if (!figure) notFound()

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/p/${slug}`}
        backLabel={`Retour à ${figure.name}`}
        title="Affilier à une organisation"
        subtitle={`Parti, syndicat, association, entreprise… : de quoi ${figure.name} fait-elle ou fait-il partie ?`}
      />
      <AffiliateFigureForm figureId={figure.id} figureSlug={figure.slug} figureName={figure.name} />
    </ContentWithSidebar>
  )
}
