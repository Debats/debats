import { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../../../components/layout/FormPageHeader'
import EditPublicFigureForm from '../../../../components/figures/EditPublicFigureForm'
import { createOccupationRepository } from '../../../../infra/database/occupation-repository-supabase'
import FigureOccupations from './FigureOccupations'

interface PageProps {
  params: Promise<{ slug: string }>
}

export const metadata: Metadata = {
  title: 'Modifier une personnalité',
  description: 'Modifier une personnalité sur Débats.co.',
}

export default async function EditPublicFigurePage({ params }: PageProps) {
  const { slug } = await params

  const contributor = await getAuthenticatedContributor()

  if (!contributor || !canPerform(contributor.reputation, 'edit_personality')) {
    redirect(`/p/${slug}`)
  }

  const supabase = createAdminSupabaseClient()
  const figureRepo = createPublicFigureRepository(supabase)
  const figure = await Effect.runPromise(figureRepo.findBySlug(slug))

  if (!figure) notFound()

  const occupationRepo = createOccupationRepository(supabase)
  const [allOccupations, figureOccupations] = await Promise.all([
    Effect.runPromise(occupationRepo.findAll()),
    Effect.runPromise(occupationRepo.findByPublicFigureId(figure.id)),
  ])
  const canAssignOccupations = canPerform(contributor.reputation, 'assign_occupation')

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader
        backHref={`/p/${slug}`}
        backLabel="Retour à la personnalité"
        title="Modifier la personnalité"
        subtitle={figure.name}
      />

      <EditPublicFigureForm
        figureId={figure.id}
        figureSlug={figure.slug}
        initialName={figure.name}
        initialPresentation={figure.presentation}
        initialWikipediaUrl={Option.isSome(figure.wikipediaUrl) ? figure.wikipediaUrl.value : ''}
        initialWebsiteUrl={Option.isSome(figure.websiteUrl) ? figure.websiteUrl.value : ''}
        initialNotorietySources={figure.notorietySources}
      />

      {canAssignOccupations && (
        <FigureOccupations
          figureId={figure.id}
          figureSlug={figure.slug}
          availableOccupations={allOccupations.map(({ id, name }) => ({ id, name }))}
          selectedIds={figureOccupations.map((o) => o.id)}
        />
      )}
    </ContentWithSidebar>
  )
}
