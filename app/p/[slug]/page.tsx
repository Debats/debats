import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../infra/database/theme-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../infra/database/organisation-membership-repository-supabase'
import { createOccupationRepository } from '../../../infra/database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../../../infra/database/occupation-family-repository-supabase'
import { occupationFamilyHref } from '../../../domain/read-models/occupations'
import { MembershipWithOrganisation } from '../../../domain/repositories/organisation-membership-repository'
import { isCurrentMembership } from '../../../domain/entities/organisation-membership'
import {
  activityPeriod,
  argumentDistribution,
  statementsPerYear,
  themeDistribution,
} from '../../../domain/services/figure-activity'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import { canPerform } from '../../../domain/reputation/permissions'
import AdminMenu from '../../../components/ui/AdminMenu'
import Button from '../../../components/ui/Button'
import SectionTabs from '../../../components/ui/SectionTabs'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import FigureHero, { Affiliation } from './FigureHero'
import StatementsBySubject, {
  orderedHref,
  parseStatementsOrder,
} from '../../../components/statements/StatementsBySubject'
import { groupStatementsBySubject } from '../../../domain/services/statements-by-subject'
import FigureAnalyses from './FigureAnalyses'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ tri?: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const publicFigureRepo = createPublicFigureRepository(supabase)
    const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))
    if (!figure) return { title: 'Personnalité introuvable' }
    const description = figure.presentation
      ? `${figure.name} - ${figure.presentation}`
      : `Positions et prises de position de ${figure.name} sur les sujets de société.`
    const url = `/p/${slug}`
    return {
      title: figure.name,
      description,
      alternates: { canonical: url },
      openGraph: {
        title: figure.name,
        description,
        type: 'profile',
        url,
      },
      twitter: {
        card: 'summary_large_image',
        title: figure.name,
        description,
      },
    }
  } catch {
    return { title: 'Personnalité' }
  }
}

/** Les affiliations en cours, telles qu'affichées en pastilles sous le libellé « Personnalité ». */
function currentAffiliations(memberships: MembershipWithOrganisation[]): Affiliation[] {
  return memberships
    .filter(({ membership }) => isCurrentMembership(membership))
    .map(({ membership, organisation }) => ({
      organisationSlug: organisation.slug,
      organisationLabel: organisation.acronym ?? organisation.name,
      role: Option.getOrNull(membership.role),
    }))
}

export default async function PersonalityDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { tri }] = await Promise.all([params, searchParams])
  const order = parseStatementsOrder(tri)

  const supabase = createAdminSupabaseClient()
  const publicFigureRepo = createPublicFigureRepository(supabase)
  const statementRepo = createStatementRepository(supabase)
  const themeRepo = createThemeRepository(supabase)
  const membershipRepo = createOrganisationMembershipRepository(supabase)

  const figure = await Effect.runPromise(publicFigureRepo.findBySlug(slug))

  if (!figure) notFound()

  const [statements, contributor, themes, primaryLinks, memberships, occupations, families] =
    await Promise.all([
      Effect.runPromise(statementRepo.findByPublicFigureWithDetails(figure.id)),
      getAuthenticatedContributor(),
      Effect.runPromise(themeRepo.findAll()),
      Effect.runPromise(themeRepo.findAllPrimaryLinks()),
      Effect.runPromise(membershipRepo.findByPublicFigureId(figure.id)),
      Effect.runPromise(createOccupationRepository(supabase).findByPublicFigureId(figure.id)),
      Effect.runPromise(createOccupationFamilyRepository(supabase).findAll()),
    ])
  const familyById = new Map(families.map((family) => [family.id, family]))
  const occupationTags = occupations.flatMap(({ occupation, current }) => {
    const family = familyById.get(occupation.familyId)
    return family ? [{ name: occupation.name, href: occupationFamilyHref(family), current }] : []
  })

  const groups = groupStatementsBySubject(statements)
  const statedDates = statements.map(({ statement }) => statement.statedAt)
  const subjectIds = groups.map(({ subject }) => subject.id)
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_personality')
  const canAffiliate = !!contributor && canPerform(contributor.reputation, 'add_membership')
  const adminActions = [
    ...(canEdit ? [{ label: 'Modifier', icon: '✎', href: `/p/${slug}/modifier` }] : []),
    ...(canAffiliate
      ? [{ label: 'Affilier à une organisation', icon: '⌂', href: `/p/${slug}/affilier` }]
      : []),
  ]

  const links = [
    ...(Option.isSome(figure.wikipediaUrl)
      ? [{ href: figure.wikipediaUrl.value, label: 'Wikipédia' }]
      : []),
    ...(Option.isSome(figure.websiteUrl)
      ? [{ href: figure.websiteUrl.value, label: 'Site officiel' }]
      : []),
  ]

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: figure.name,
    description: figure.presentation,
    url: `https://debats.co/p/${figure.slug}`,
    image: `https://debats.co/avatars/${figure.slug}.jpg`,
    ...(Option.isSome(figure.wikipediaUrl) ? { sameAs: [figure.wikipediaUrl.value] } : {}),
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FigureHero
        slug={figure.slug}
        name={figure.name}
        presentation={figure.presentation}
        links={links}
        counts={{
          statements: statements.length,
          subjects: groups.length,
          period: activityPeriod(statedDates),
        }}
        occupations={occupationTags}
        affiliations={currentAffiliations(memberships)}
        adminMenu={adminActions.length > 0 && <AdminMenu actions={adminActions} />}
        actions={
          <>
            {contributor ? (
              <Button
                href={`/nouvelle-prise-de-position?figureId=${figure.id}&figureName=${encodeURIComponent(figure.name)}`}
              >
                Ajouter une prise de position
              </Button>
            ) : (
              <Button href="/contribuer">Ajouter une prise de position</Button>
            )}
            <ShareButton compact title={figure.name} />
          </>
        }
      />

      <ContentWithSidebar
        topMargin
        aside={
          <FigureAnalyses
            themes={themeDistribution(subjectIds, primaryLinks, themes)}
            perYear={statementsPerYear(statedDates)}
            topArguments={argumentDistribution(statements)}
          />
        }
      >
        <SectionTabs
          ariaLabel="Sections de la personnalité"
          active="Prises de position"
          tabs={[
            { label: 'Prises de position', count: statements.length },
            { label: 'Analyses', soon: true },
          ]}
        />
        <StatementsBySubject
          statements={statements}
          order={order}
          subjectHref={(subjectSlug) => `/p/${slug}/s/${subjectSlug}`}
          orderHref={(wanted) => orderedHref(`/p/${slug}`, wanted)}
        />
      </ContentWithSidebar>
    </>
  )
}
