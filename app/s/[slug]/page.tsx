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
import { isMajorSubject } from '../../../domain/entities/subject'
import { canPerform } from '../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import Button from '../../../components/ui/Button'
import ShareButton from '../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import SubjectAdminMenu from './SubjectAdminMenu'
import SubjectHero from './SubjectHero'
import SubjectTabs from './SubjectTabs'
import PositionsOverview from './PositionsOverview'
import PositionsFilter from './PositionsFilter'
import PositionCard from './PositionCard'
import ReadingGuide from './ReadingGuide'
import SubjectLatestStatements from './SubjectLatestStatements'
import OrganisationsSoon from './OrganisationsSoon'
import styles from './subject-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
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

export default async function SubjectDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) notFound()

  const statementRepo = createStatementRepository(supabase)
  const themeRepo = createThemeRepository(supabase)
  const relatedRepo = createRelatedSubjectsRepository(supabase)

  const [positions, stats, latestStatements, contributor, themeAssignments, relatedSubjects] =
    await Promise.all([
      Effect.runPromise(getSubjectPositionsSummary(supabase, subject.id)),
      Effect.runPromise(subjectRepo.getStats(subject.id)),
      Effect.runPromise(statementRepo.findLatest(LATEST_STATEMENTS_LIMIT, subject.id)),
      getAuthenticatedContributor(),
      Effect.runPromise(themeRepo.findAssignmentsBySubjectId(subject.id)),
      Effect.runPromise(relatedRepo.findRelated(subject.id)),
    ])

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
            {contributor ? (
              <Button
                href={`/nouvelle-prise-de-position?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}`}
              >
                Ajouter une prise de position
              </Button>
            ) : (
              <Button href="/contribuer">Ajouter une prise de position</Button>
            )}
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
            <OrganisationsSoon />
          </>
        }
      >
        <SubjectTabs positionsCount={positions.length} />
        <PositionsFilter
          statementsCount={stats.statementsCount}
          positionsCount={positions.length}
        />

        {positions.length === 0 ? (
          <p className={styles.empty}>Aucune position enregistrée pour l’instant.</p>
        ) : (
          <div className={styles.list}>
            {positions.map((position, index) => (
              <PositionCard
                key={position.positionId}
                position={position}
                subjectSlug={slug}
                featured={index === 0 && positions.length > 1}
              />
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
