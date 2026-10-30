import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../../infra/database/organisation-membership-repository-supabase'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../../infra/database/theme-repository-supabase'
import { ORGANISATION_TYPE_LABELS } from '../../../../domain/entities/organisation'
import { isCurrentMembership } from '../../../../domain/entities/organisation-membership'
import { organisationAuthor } from '../../../../domain/entities/statement'
import { organisationRef } from '../../../../domain/read-models/statement-author'
import {
  AUTHOR_TAB_LABELS,
  AuthorTab,
  authorTabs,
} from '../../../../domain/read-models/author-tabs'
import { groupStatementsBySubject } from '../../../../domain/services/statements-by-subject'
import { argumentDistribution } from '../../../../domain/services/figure-activity'
import { analyseAuthor, memberCohesion } from '../../../../domain/services/author-analyses'
import TopArguments from '../../../../components/statements/TopArguments'
import AuthorAnalyses from '../../../../components/statements/AuthorAnalyses'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import AdminMenu from '../../../../components/ui/AdminMenu'
import Button from '../../../../components/ui/Button'
import SectionTabs from '../../../../components/ui/SectionTabs'
import ShareButton from '../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import StatementsBySubject from '../../../../components/statements/StatementsBySubject'
import {
  parseStatementsView,
  statementsViewHref,
} from '../../../../domain/read-models/statements-view'
import { statementsOnTheme } from '../../../../domain/services/statements-on-theme'
import { subjectIdsOnTheme } from '../../../../infra/queries/subject-ids-on-theme'
import OrganisationHero from '../OrganisationHero'
import OrganisationMembers from '../OrganisationMembers'
import OrganisationCohesion from '../OrganisationCohesion'

interface OrganisationDetailProps {
  slug: string
  /** The route decides the tab; each tab has its own address */
  activeTab: AuthorTab
  /** The `tri` and `theme` parameters of the statements tab */
  viewParams: { tri?: string; theme?: string }
}

/** The whole organisation page; the two tab routes render it with their tab. */
export default async function OrganisationDetail({
  slug,
  activeTab,
  viewParams,
}: OrganisationDetailProps) {
  const view = parseStatementsView(viewParams)

  const supabase = createAdminSupabaseClient()
  const organisationRepo = createOrganisationRepository(supabase)
  const membershipRepo = createOrganisationMembershipRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const organisation = await Effect.runPromise(organisationRepo.findBySlug(slug))

  if (!organisation) notFound()

  const themeRepo = createThemeRepository(supabase)
  const [memberships, statements, contributor, themes] = await Promise.all([
    Effect.runPromise(membershipRepo.findByOrganisationId(organisation.id)),
    Effect.runPromise(statementRepo.findByOrganisationWithDetails(organisation.id)),
    getAuthenticatedContributor(),
    Effect.runPromise(themeRepo.findAll()),
  ])
  const listed = view.themeSlug
    ? statementsOnTheme(statements, await subjectIdsOnTheme(themeRepo, view.themeSlug))
    : statements

  const current = memberships.filter(({ membership }) => isCurrentMembership(membership))
  const former = memberships.filter(({ membership }) => !isCurrentMembership(membership))
  const groups = groupStatementsBySubject(statements)
  // Only the Analyses tab reads everyone's statements on its subjects
  const onSubjects =
    activeTab === 'analyses'
      ? await Effect.runPromise(
          statementRepo.findBySubjectIdsWithAuthors(groups.map(({ subject }) => subject.id)),
        )
      : null
  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_organisation')
  const canAffiliate = !!contributor && canPerform(contributor.reputation, 'add_membership')
  const canRemove = !!contributor && canPerform(contributor.reputation, 'remove_membership')
  const canEditStatement = !!contributor && canPerform(contributor.reputation, 'edit_statement')
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
  const base = `/o/${slug}`
  const self = organisationAuthor(organisation.id)

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
          <>
            <OrganisationMembers
              organisationSlug={slug}
              current={current}
              former={former}
              canAffiliate={canAffiliate}
              canRemove={canRemove}
            />
            <TopArguments arguments={argumentDistribution(statements)} who="cette organisation" />
          </>
        }
      >
        <SectionTabs
          ariaLabel="Sections de l'organisation"
          active={AUTHOR_TAB_LABELS[activeTab]}
          tabs={authorTabs(base, statements.length)}
        />
        {onSubjects ? (
          <AuthorAnalyses
            author={organisationRef({ ...organisation, acronym })}
            who="cette organisation"
            analysis={analyseAuthor(statements, onSubjects, self)}
          >
            <OrganisationCohesion
              organisationSlug={slug}
              membersCount={current.length}
              cohesion={memberCohesion(
                statements,
                onSubjects,
                self,
                current.map(({ figure }) => figure),
              )}
            />
          </AuthorAnalyses>
        ) : (
          <StatementsBySubject
            statements={listed}
            view={view}
            themes={themes}
            subjectHref={(subjectSlug) => `/s/${subjectSlug}`}
            viewHref={(wanted) => statementsViewHref(base, wanted)}
            editHref={
              canEditStatement
                ? (statementId) => `/prise-de-position/${statementId}/modifier`
                : undefined
            }
          />
        )}
      </ContentWithSidebar>
    </>
  )
}
