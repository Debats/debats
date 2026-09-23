import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
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
import PositionCard from './PositionCard'
import styles from './subject-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

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

  const themeRepo = createThemeRepository(supabase)
  const relatedRepo = createRelatedSubjectsRepository(supabase)

  const [positions, stats, contributor, themeAssignments, relatedSubjects] = await Promise.all([
    Effect.runPromise(getSubjectPositionsSummary(supabase, subject.id)),
    Effect.runPromise(subjectRepo.getStats(subject.id)),
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

  const positionsHint =
    positions.length > 1
      ? `${positions.length} positions, de la plus à la moins soutenue`
      : undefined

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
        themes={themeAssignments.map((assignment) => assignment.theme)}
        relatedSubjects={relatedSubjects}
        counts={{
          positions: positions.length,
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
            {contributor && (
              <>
                <Button
                  href={`/nouvelle-prise-de-position?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}`}
                >
                  Ajouter une prise de position
                </Button>
                {canAddPosition && (
                  <Button href={`/s/${slug}/nouvelle-position`} variant="secondary">
                    Ajouter une position
                  </Button>
                )}
              </>
            )}
            <ShareButton title={subject.title} text={subject.presentation} />
          </>
        }
      />

      <ContentWithSidebar topMargin>
        <section>
          <header className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>Qui pense quoi ?</h2>
            {positionsHint && <p className={styles.sectionHint}>{positionsHint}</p>}
          </header>

          {positions.length === 0 ? (
            <p className={styles.empty}>Aucune prise de position enregistrée.</p>
          ) : (
            <div className={styles.list}>
              {positions.map((position) => (
                <PositionCard key={position.positionId} position={position} subjectSlug={slug} />
              ))}
            </div>
          )}
        </section>
      </ContentWithSidebar>
    </>
  )
}
