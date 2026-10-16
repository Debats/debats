import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../../infra/database/theme-repository-supabase'
import { createRelatedSubjectsRepository } from '../../../infra/database/related-subjects-repository-supabase'
import { getSubjectPositionsSummary } from '../../../infra/queries/subject-positions-summary'
import { getSubjectArgumentsSummary } from '../../../infra/queries/subject-arguments-summary'
import { isMajorSubject } from '../../../domain/entities/subject'
import { positionAuthorsCount } from '../../../domain/read-models/subject-positions-summary'
import { argumentsByPosition } from '../../../domain/read-models/argument'
import { canPerform } from '../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import Button from '../../../components/ui/Button'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import SubjectAdminMenu from './SubjectAdminMenu'
import SubjectHero from './SubjectHero'
import SubjectTabs from './SubjectTabs'
import PositionsOverview from './PositionsOverview'
import PositionsFilter, { parseAuthorKindParam } from './PositionsFilter'
import PositionCard from './PositionCard'
import ReadingGuide from './ReadingGuide'
import SubjectLatestStatements from './SubjectLatestStatements'
import SubjectOrganisations from './SubjectOrganisations'
import SubjectArguments from './SubjectArguments'
import styles from './subject-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ qui?: string; onglet?: string }>
}

const LATEST_STATEMENTS_LIMIT = 5

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) return { title: 'Sujet introuvable' }
    const url = `/s/${slug}`
    return {
      title: subject.title,
      description: subject.presentation,
      alternates: { canonical: url },
      openGraph: {
        title: subject.title,
        description: subject.presentation,
        type: 'article',
        url,
      },
      twitter: {
        card: 'summary_large_image',
        title: subject.title,
        description: subject.presentation,
      },
    }
  } catch {
    return { title: 'Sujet' }
  }
}

export default async function SubjectDetailPage({ params, searchParams }: PageProps) {
  const [{ slug }, { qui, onglet }] = await Promise.all([params, searchParams])
  const authorKind = parseAuthorKindParam(qui)
  const activeTab = onglet === 'arguments' ? 'arguments' : 'positions'

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) notFound()

  const statementRepo = createStatementRepository(supabase)
  const themeRepo = createThemeRepository(supabase)
  const relatedRepo = createRelatedSubjectsRepository(supabase)

  const [
    positions,
    filteredPositions,
    subjectArguments,
    stats,
    latestStatements,
    contributor,
    themeAssignments,
    relatedSubjects,
  ] = await Promise.all([
    Effect.runPromise(getSubjectPositionsSummary(supabase, subject.id)),
    // The overview and the rail always show everyone; only the list follows the filter
    authorKind
      ? Effect.runPromise(getSubjectPositionsSummary(supabase, subject.id, { authorKind }))
      : null,
    Effect.runPromise(getSubjectArgumentsSummary(supabase, subject.id)),
    Effect.runPromise(subjectRepo.getStats(subject.id)),
    Effect.runPromise(statementRepo.findLatest(LATEST_STATEMENTS_LIMIT, subject.id)),
    getAuthenticatedContributor(),
    Effect.runPromise(themeRepo.findAssignmentsBySubjectId(subject.id)),
    Effect.runPromise(relatedRepo.findRelated(subject.id)),
  ])

  const listedPositions = filteredPositions
    ? filteredPositions.filter((position) => positionAuthorsCount(position) > 0)
    : positions
  const positionArguments = argumentsByPosition(subjectArguments)

  const newStatementHref = contributor
    ? `/nouvelle-prise-de-position?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}`
    : '/contribuer'
  const canAddPosition = !!contributor && canPerform(contributor.reputation, 'add_position')
  const canEditSubject = !!contributor && canPerform(contributor.reputation, 'edit_subject')
  const major = isMajorSubject(subject, stats.statementsCount)
  const canDelete =
    !!contributor &&
    canPerform(contributor.reputation, major ? 'delete_major_subject' : 'delete_minor_subject')

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: subject.title,
    description: subject.presentation,
    url: `https://debats.co/s/${subject.slug}`,
    author: { '@type': 'Organization', name: 'Débats.co', url: 'https://debats.co' },
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SubjectHero
        title={subject.title}
        problem={subject.problem}
        presentation={subject.presentation}
        updatedAt={subject.updatedAt}
        themes={themeAssignments.map((assignment) => assignment.theme)}
        relatedSubjects={relatedSubjects}
        counts={{
          publicFigures: stats.publicFiguresCount,
          organisations: stats.organisationsCount,
          statements: stats.statementsCount,
        }}
        adminMenu={
          (canEditSubject || canDelete) && (
            <SubjectAdminMenu
              subjectId={subject.id}
              subjectSlug={subject.slug}
              canEdit={canEditSubject}
              canDelete={canDelete}
            />
          )
        }
        actions={
          <>
            <Button href={newStatementHref}>Ajouter une prise de position</Button>
            <ShareButton compact title={subject.title} text={subject.presentation} />
          </>
        }
        secondaryAction={
          canAddPosition && (
            <>
              Aucune position ne correspond ?{' '}
              <Link href={`/s/${slug}/nouvelle-position`} className={styles.link}>
                Proposer une nouvelle position
              </Link>
            </>
          )
        }
        overview={<PositionsOverview positions={positions} />}
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <ReadingGuide />
            <SubjectLatestStatements statements={latestStatements} />
            <SubjectOrganisations positions={positions} />
          </>
        }
      >
        <SubjectTabs
          subjectSlug={slug}
          active={activeTab}
          positionsCount={positions.length}
          argumentsCount={subjectArguments.length}
        />

        {activeTab === 'arguments' ? (
          <SubjectArguments
            subjectSlug={slug}
            arguments={subjectArguments}
            newStatementHref={newStatementHref}
          />
        ) : (
          <>
            <PositionsFilter
              subjectSlug={slug}
              authorKind={authorKind}
              counts={{
                all: stats.statementsCount,
                publicFigures: stats.figureStatementsCount,
                organisations: stats.organisationStatementsCount,
              }}
              positionsCount={listedPositions.length}
            />

            {listedPositions.length === 0 ? (
              <p className={styles.empty}>
                {authorKind
                  ? 'Aucune prise de position de ce type pour l’instant.'
                  : 'Aucune position enregistrée pour l’instant.'}
              </p>
            ) : (
              <div className={styles.list}>
                {listedPositions.map((position, index) => (
                  <PositionCard
                    key={position.positionId}
                    position={position}
                    subjectSlug={slug}
                    arguments={positionArguments.get(position.positionId) ?? []}
                    featured={index === 0 && listedPositions.length > 1}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </ContentWithSidebar>
    </>
  )
}
