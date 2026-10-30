import { notFound } from 'next/navigation'
import { Effect, Option } from 'effect'
import { createAdminSupabaseClient } from '../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../infra/database/public-figure-repository-supabase'
import { createStatementRepository } from '../../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../../infra/database/theme-repository-supabase'
import { createOrganisationMembershipRepository } from '../../../../infra/database/organisation-membership-repository-supabase'
import { createOccupationRepository } from '../../../../infra/database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../../../../infra/database/occupation-family-repository-supabase'
import { occupationFamilyHref } from '../../../../domain/read-models/occupations'
import { MembershipWithOrganisation } from '../../../../domain/repositories/organisation-membership-repository'
import { isCurrentMembership } from '../../../../domain/entities/organisation-membership'
import { publicFigureAuthor } from '../../../../domain/entities/statement'
import { publicFigureRef } from '../../../../domain/read-models/statement-author'
import { AuthorTab, authorTabHref } from '../../../../domain/read-models/author-tabs'
import {
  activityPeriod,
  argumentDistribution,
  statementsPerYear,
  themeDistribution,
} from '../../../../domain/services/figure-activity'
import {
  company,
  expressionProfile,
  organisationsLine,
  positionChanges,
  standing,
} from '../../../../domain/services/author-analyses'
import { getAuthenticatedContributor } from '../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../domain/reputation/permissions'
import AdminMenu from '../../../../components/ui/AdminMenu'
import Button from '../../../../components/ui/Button'
import SectionTabs from '../../../../components/ui/SectionTabs'
import ShareButton from '../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../components/layout/ContentWithSidebar'
import FigureHero, { Affiliation } from '../FigureHero'
import StatementsBySubject from '../../../../components/statements/StatementsBySubject'
import AuthorAnalyses from '../../../../components/statements/AuthorAnalyses'
import {
  parseStatementsView,
  statementsViewHref,
} from '../../../../domain/read-models/statements-view'
import { statementsOnTheme } from '../../../../domain/services/statements-on-theme'
import { subjectIdsOnTheme } from '../../../../infra/queries/subject-ids-on-theme'
import { groupStatementsBySubject } from '../../../../domain/services/statements-by-subject'
import FigureAnalyses from '../FigureAnalyses'
import FigureOrganisationsLine from '../FigureOrganisationsLine'

interface FigureDetailProps {
  slug: string
  /** The route decides the tab; each tab has its own address */
  activeTab: AuthorTab
  /** The `tri` and `theme` parameters of the statements tab */
  viewParams: { tri?: string; theme?: string }
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

/** The whole public figure page; the two tab routes render it with their tab. */
export default async function FigureDetail({ slug, activeTab, viewParams }: FigureDetailProps) {
  const view = parseStatementsView(viewParams)

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
  const listed = view.themeSlug
    ? statementsOnTheme(statements, await subjectIdsOnTheme(themeRepo, view.themeSlug))
    : statements
  const statedDates = statements.map(({ statement }) => statement.statedAt)
  const subjectIds = groups.map(({ subject }) => subject.id)
  // Only the Analyses tab reads everyone's statements on her subjects
  const onSubjects =
    activeTab === 'analyses'
      ? await Effect.runPromise(statementRepo.findBySubjectIdsWithAuthors(subjectIds))
      : null
  const currentMemberships = memberships.filter(({ membership }) => isCurrentMembership(membership))
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

  const base = `/p/${slug}`
  const self = publicFigureAuthor(figure.id)

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
          active={activeTab === 'analyses' ? 'Analyses' : 'Prises de position'}
          tabs={[
            {
              label: 'Prises de position',
              count: statements.length,
              href: authorTabHref(base, 'statements'),
            },
            { label: 'Analyses', href: authorTabHref(base, 'analyses') },
          ]}
        />
        {onSubjects ? (
          <AuthorAnalyses
            author={publicFigureRef(figure)}
            who="cette personnalité"
            company={company(statements, onSubjects, self)}
            standing={standing(statements, onSubjects, self)}
            changes={positionChanges(statements)}
            profile={expressionProfile(statements)}
          >
            {currentMemberships.length > 0 && (
              <FigureOrganisationsLine
                figureSlug={slug}
                line={organisationsLine(
                  statements,
                  onSubjects,
                  self,
                  currentMemberships.map(({ organisation }) => organisation),
                )}
              />
            )}
          </AuthorAnalyses>
        ) : (
          <StatementsBySubject
            statements={listed}
            view={view}
            themes={themes}
            subjectHref={(subjectSlug) => `/p/${slug}/s/${subjectSlug}`}
            viewHref={(wanted) => statementsViewHref(base, wanted)}
          />
        )}
      </ContentWithSidebar>
    </>
  )
}
