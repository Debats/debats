import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../infra/database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../infra/database/organisation-membership-repository-supabase'
import { ORGANISATION_TYPE_LABELS } from '../../../domain/entities/organisation'
import { isCurrentMembership } from '../../../domain/entities/organisation-membership'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import AdminMenu from '../../../components/ui/AdminMenu'
import Button from '../../../components/ui/Button'
import SectionTabs from '../../../components/ui/SectionTabs'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import OrganisationHero from './OrganisationHero'
import OrganisationMembers from './OrganisationMembers'
import OrganisationStatementsSoon from './OrganisationStatementsSoon'

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

  const organisation = await Effect.runPromise(organisationRepo.findBySlug(slug))

  if (!organisation) notFound()

  const [memberships, contributor] = await Promise.all([
    Effect.runPromise(membershipRepo.findByOrganisationId(organisation.id)),
    getAuthenticatedContributor(),
  ])

  const current = memberships.filter(({ membership }) => isCurrentMembership(membership))
  const former = memberships.filter(({ membership }) => !isCurrentMembership(membership))
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
        membersCount={current.length}
        adminMenu={
          canEdit && (
            <AdminMenu actions={[{ label: 'Modifier', icon: '✎', href: `/o/${slug}/modifier` }]} />
          )
        }
        actions={
          <>
            {canAffiliate && (
              <Button href={`/o/${slug}/affilier`}>Affilier une personnalité</Button>
            )}
            <ShareButton compact title={organisation.name} />
          </>
        }
      />

      <ContentWithSidebar topMargin hideLatestStatements aside={<OrganisationStatementsSoon />}>
        <SectionTabs
          ariaLabel="Sections de l'organisation"
          active="Personnalités affiliées"
          tabs={[
            { label: 'Personnalités affiliées', count: memberships.length },
            { label: 'Prises de position', soon: true },
          ]}
        />
        <OrganisationMembers
          organisationSlug={slug}
          current={current}
          former={former}
          canRemove={canRemove}
        />
      </ContentWithSidebar>
    </>
  )
}
