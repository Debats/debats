import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import {
  ORGANISATION_TYPE_PLURAL_LABELS,
  parseOrganisationTypeSlug,
  pluralTypeInSentence,
} from '../../../../domain/entities/organisation'
import {
  orderByEngagement,
  organisationsOfTypeIntro,
} from '../../../../domain/read-models/organisation-summary'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import ActionLink from '../../../../components/ui/ActionLink'
import Button from '../../../../components/ui/Button'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import PageHero from '../../../../components/layout/PageHero'
import OrganisationGrid from '../../../../components/organisations/OrganisationGrid'
import OrganisationSearch from '../../../../components/organisations/OrganisationSearch'
import styles from './organisation-type.module.css'

interface PageProps {
  params: Promise<{ type: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const type = parseOrganisationTypeSlug((await params).type)
  if (!type) return { title: 'Type d’organisation introuvable' }

  return {
    title: ORGANISATION_TYPE_PLURAL_LABELS[type],
    description: `Les ${pluralTypeInSentence(type)} sur Débats.co, et leurs prises de position dans le débat public.`,
  }
}

export default async function OrganisationTypePage({ params }: PageProps) {
  const type = parseOrganisationTypeSlug((await params).type)
  if (!type) notFound()

  const supabase = createAdminSupabaseClient()
  const repo = createOrganisationRepository(supabase)

  const [summaries, contributor] = await Promise.all([
    Effect.runPromise(repo.findSummariesByType(type)),
    getAuthenticatedContributor(),
  ])
  const canAdd = !!contributor && canPerform(contributor.reputation, 'add_organisation')
  const organisations = orderByEngagement(summaries)

  return (
    <>
      <PageHero
        kicker="Organisations"
        title={ORGANISATION_TYPE_PLURAL_LABELS[type]}
        intro={organisationsOfTypeIntro(organisations.length)}
        actions={canAdd && <Button href="/o/ajouter">Ajouter une organisation</Button>}
      >
        <OrganisationSearch />
      </PageHero>

      <ContentWithSidebar topMargin>
        <OrganisationGrid organisations={organisations} />
        <p className={styles.back}>
          <ActionLink href="/o">Revenir à toutes les organisations</ActionLink>
        </p>
      </ContentWithSidebar>
    </>
  )
}
