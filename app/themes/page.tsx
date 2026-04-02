import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { canPerform } from '../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import FormPageHeader from '../../components/layout/FormPageHeader'
import ThemeList from './ThemeList'
import NewThemeForm from './NewThemeForm'

export const metadata: Metadata = {
  title: 'Thématiques',
  description: 'Les thématiques de Débats.co.',
}

export default async function ThemesPage() {
  const supabase = createAdminSupabaseClient()
  const themeRepo = createThemeRepository(supabase)

  const [themes, contributor] = await Promise.all([
    Effect.runPromise(themeRepo.findAll()),
    getAuthenticatedContributor(),
  ])

  const canManage = !!contributor && canPerform(contributor.reputation, 'add_theme')

  const themesData = themes.map((t) => ({
    id: t.id,
    name: t.name,
    slug: t.slug,
    description: t.description,
  }))

  return (
    <ContentWithSidebar topMargin>
      <FormPageHeader backHref="/s" backLabel="Retour aux sujets" title="Thématiques" />

      <ThemeList themes={themesData} canManage={canManage} />

      {canManage && <NewThemeForm />}
    </ContentWithSidebar>
  )
}
