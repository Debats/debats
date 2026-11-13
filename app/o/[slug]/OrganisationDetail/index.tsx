import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createOrganisationRepository } from '../../../../infra/database/organisation-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../../infra/database/organisation-membership-repository-supabase'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../../infra/database/theme-repository-supabase'
import { ORGANISATION_TYPE_LABELS } from '../../../../domain/entities/organisation'
import { splitMemberships } from '../../../../domain/services/memberships'
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
import ReviewScope from '../../../../components/review/ReviewScope'
import { reviewOf } from '../../../review-of'
import {
  parseStatementsView,
  statementsViewHref,
} from '../../../../domain/read-models/statements-view'
import {
  CONTRIBUTE_HREF,
  organisationHref,
  statementEditHref,
  subjectHref,
} from '../../../../domain/read-models/hrefs'
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

  // Un seul jour pour toute la page : ce qui est en cours et ce que les libellés en disent
  const today = new Date()
  const { current, former } = splitMemberships(memberships, today)
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
    url: `https://debats.co${organisationHref(organisation.slug)}`,
    logo: `https://debats.co/logos/${organisation.slug}.png`,
    ...(Option.isSome(organisation.wikipediaUrl)
      ? { sameAs: [organisation.wikipediaUrl.value] }
      : {}),
  }

  const newStatementHref = contributor
    ? `/nouvelle-prise-de-position?organisationId=${organisation.id}&organisationName=${encodeURIComponent(organisation.name)}`
    : CONTRIBUTE_HREF
  const base = organisationHref(slug)
  const self = organisationAuthor(organisation.id)
  // The organisation itself, and the statements the list shows
  const review = await reviewOf(supabase, contributor, [
    organisation.id,
    ...listed.map(({ statement }) => statement.id),
  ])

  return (
    <ReviewScope {...review}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <OrganisationHero
        id={organisation.id}
        slug={organisation.slug}
        name={organisation.name}
        acronym={acronym}
        typeLabel={ORGANISATION_TYPE_LABELS[organisation.organisationType]}
        presentation={organisation.presentation}
        links={links}
        counts={{ statements: statements.length, subjects: groups.length, members: current.length }}
        adminMenu={
          canEdit && (
            <AdminMenu actions={[{ label: 'Modifier', icon: '✎', href: `${base}/modifier` }]} />
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
              today={today}
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
            subjectHref={subjectHref}
            viewHref={(wanted) => statementsViewHref(base, wanted)}
            editHref={canEditStatement ? statementEditHref : undefined}
          />
        )}
      </ContentWithSidebar>
    </ReviewScope>
  )
}
