import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../infra/database/organisation-membership-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { isCurrentMembership } from '../../../domain/entities/organisation-membership'
import { groupStatementsBySubject } from '../../../domain/services/statements-by-subject'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import AdminMenu from '../../../components/ui/AdminMenu'
import Button from '../../../components/ui/Button'
import SectionTabs from '../../../components/ui/SectionTabs'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import StatementsBySubject from '../../../components/statements/StatementsBySubject'
import OrganisationHero from './OrganisationHero'
import OrganisationMembers from './OrganisationMembers'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const organisation = await Effect.runPromise(
      createOrganisationRepository(supabase).findBySlug(slug),
    )
    if (!organisation) return { title: 'Organisation introuvable' }
    const description = `${organisation.name} - ${organisation.presentation}`
    const url = `/o/${slug}`
    return {
      title: organisation.name,
      description,
      alternates: { canonical: url },
      openGraph: { title: organisation.name, description, type: 'profile', url },
      twitter: { card: 'summary_large_image', title: organisation.name, description },
    }
  } catch {
    return { title: 'Organisation' }
  }
}

export default async function OrganisationDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const organisationRepo = createOrganisationRepository(supabase)
  const membershipRepo = createOrganisationMembershipRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const organisation = await Effect.runPromise(organisationRepo.findBySlug(slug))

  if (!organisation) notFound()

  const [memberships, statements, contributor] = await Promise.all([
    Effect.runPromise(membershipRepo.findByOrganisationId(organisation.id)),
    Effect.runPromise(statementRepo.findByOrganisationWithDetails(organisation.id)),
    getAuthenticatedContributor(),
  ])

  const current = memberships.filter(({ membership }) => isCurrentMembership(membership))
  const former = memberships.filter(({ membership }) => !isCurrentMembership(membership))
  const groups = groupStatementsBySubject(statements)
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_organisation')
  const canAffiliate = !!contributor && canPerform(contributor.reputation, 'add_membership')
  const canRemove = !!contributor && canPerform(contributor.reputation, 'remove_membership')
  const acronym = Option.getOrNull(organisation.acronym)

  const links = [
    ...(Option.isSome(organisation.wikipediaUrl)
      ? [{ href: organisation.wikipediaUrl.value, label: 'Wikipédia' }]
      : []),
    ...(Option.isSome(organisation.websiteUrl)
      ? [{ href: organisation.websiteUrl.value, label: 'Site officiel' }]
      : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: organisation.name,
    ...(acronym ? { alternateName: acronym } : {}),
    description: organisation.presentation,
    url: `https://debats.co/o/${organisation.slug}`,
    logo: `https://debats.co/logos/${organisation.slug}.png`,
    ...(Option.isSome(organisation.wikipediaUrl)
      ? { sameAs: [organisation.wikipediaUrl.value] }
      : {}),
  }

  const newStatementHref = contributor
    ? `/nouvelle-prise-de-position?organisationId=${organisation.id}&organisationName=${encodeURIComponent(organisation.name)}`
    : '/contribuer'

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OrganisationHero
        slug={organisation.slug}
        name={organisation.name}
        acronym={acronym}
        typeLabel={ORGANISATION_TYPE_LABELS[organisation.organisationType]}
        presentation={organisation.presentation}
        links={links}
        counts={{ statements: statements.length, subjects: groups.length, members: current.length }}
        adminMenu={
          canEdit && (
            <AdminMenu actions={[{ label: 'Modifier', icon: '✎', href: `/o/${slug}/modifier` }]} />
          )
        }
        actions={
          <>
            <Button href={newStatementHref}>Ajouter une prise de position</Button>
            <ShareButton compact title={organisation.name} />
          </>
        }
      />

      <ContentWithSidebar
        topMargin
        aside={
          <OrganisationMembers
            organisationSlug={slug}
            current={current}
            former={former}
            canAffiliate={canAffiliate}
            canRemove={canRemove}
          />
        }
      >
        <SectionTabs
          ariaLabel="Sections de l'organisation"
          active="Prises de position"
          tabs={[
            { label: 'Prises de position', count: statements.length },
            { label: 'Analyses', soon: true },
          ]}
        />
        <StatementsBySubject groups={groups} subjectHref={(subjectSlug) => `/s/${subjectSlug}`} />
      </ContentWithSidebar>
    </>
  )
}
