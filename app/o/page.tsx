import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createOrganisationRepository } from '../../infra/database/organisation-repository-supabase'
import {
  ORGANISATION_TYPES,
  ORGANISATION_TYPE_PLURAL_LABELS,
} from '../../domain/entities/organisation'
import { OrganisationSummary } from '../../domain/read-models/organisation-summary'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import Button from '../../components/ui/Button'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import OrganisationCard from './OrganisationCard'
import styles from './organisations.module.css'

export const metadata: Metadata = {
  title: 'Organisations',
  description:
    'Les partis, ONG, syndicats, entreprises et collectifs référencés sur Débats.co, et les personnalités qui en font partie.',
}

/** Les organisations regroupées par type, dans l'ordre des types, sans groupe vide. */
function groupByType(organisations: OrganisationSummary[]) {
  return ORGANISATION_TYPES.map((type) => ({
    type,
    label: ORGANISATION_TYPE_PLURAL_LABELS[type],
    organisations: organisations.filter((o) => o.organisationType === type),
  })).filter((group) => group.organisations.length > 0)
}

export default async function OrganisationsPage() {
  const supabase = createAdminSupabaseClient()
  const repo = createOrganisationRepository(supabase)

  const [organisations, contributor] = await Promise.all([
    Effect.runPromise(repo.findSummaries()),
    getAuthenticatedContributor(),
  ])
  const canAdd = !!contributor && canPerform(contributor.reputation, 'add_organisation')
  const groups = groupByType(organisations)

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les organisations"
        intro="Partis, ONG, syndicats, entreprises et collectifs : qui s'engage dans le débat public, et qui en fait partie."
        actions={canAdd && <Button href="/o/ajouter">Ajouter une organisation</Button>}
      />

      <ContentWithSidebar topMargin>
        {groups.length === 0 ? (
          <p className={styles.empty}>
            Aucune organisation n&apos;est encore référencée. Les contributeur·ices de rang Éloquent
            peuvent en ajouter.
          </p>
        ) : (
          groups.map((group) => (
            <section key={group.type} className={styles.section}>
              <h2 className={styles.sectionTitle}>{group.label}</h2>
              <div className={styles.grid}>
                {group.organisations.map((organisation) => (
                  <OrganisationCard key={organisation.id} organisation={organisation} />
                ))}
              </div>
            </section>
          ))
        )}
      </ContentWithSidebar>
    </>
  )
}
