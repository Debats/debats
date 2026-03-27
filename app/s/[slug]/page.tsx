import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../infra/supabase/ssr'
import { createSubjectRepository } from '../../../infra/database/subject-repository-supabase'
import { getSubjectPositionsSummary } from '../../../infra/queries/subject-positions-summary'
import { isMajorSubject } from '../../../domain/entities/subject'
import { canPerform } from '../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../actions/get-authenticated-contributor'
import FigureAvatarRow from '../../../components/figures/FigureAvatarRow'
import Button from '../../../components/ui/Button'
import SubjectAdminMenu from './SubjectAdminMenu'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import styles from './subject-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = await createSSRSupabaseClient()
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

  const supabase = await createSSRSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))

  if (!subject) notFound()

  const [positions, stats, contributor] = await Promise.all([
    Effect.runPromise(getSubjectPositionsSummary(supabase, subject.id)),
    Effect.runPromise(subjectRepo.getStats(subject.id)),
    getAuthenticatedContributor(),
  ])

  const totalFigures = stats.publicFiguresCount

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
    <ContentWithSidebar topMargin>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{subject.title}</h1>
          {(canEditSubject || canDelete) && (
            <SubjectAdminMenu
              subjectId={subject.id}
              subjectSlug={subject.slug}
              canEdit={canEditSubject}
              canDelete={canDelete}
            />
          )}
        </div>
        <p className={styles.presentation}>{subject.presentation}</p>
        <p className={styles.problem}>{subject.problem}</p>
        {contributor && (
          <div className={styles.headerActions}>
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
          </div>
        )}
      </header>

      <section>
        <h2 className={styles.sectionTitle}>
          POSITIONS <span className={styles.count}>{positions.length}</span>{' '}
          <span className={styles.countDetail}>
            ({totalFigures} personnalité{totalFigures !== 1 ? 's' : ''})
          </span>
        </h2>

        {positions.length === 0 ? (
          <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
        ) : (
          <div className={styles.positionsList}>
            {positions.map((pos) => (
              <div key={pos.positionId} className={styles.positionItem}>
                <h3 className={styles.positionTitle}>
                  <Link
                    href={`/s/${slug}/position/${pos.positionId}`}
                    className={styles.positionLink}
                  >
                    {pos.positionTitle}
                  </Link>
                </h3>
                <p className={styles.positionDescription}>{pos.positionDescription}</p>
                <a href="#" className={styles.viewArguments}>
                  Voir les arguments
                </a>
                <FigureAvatarRow
                  figures={pos.figures}
                  totalCount={pos.totalFiguresCount}
                  size={40}
                />
              </div>
            ))}
          </div>
        )}
      </section>
    </ContentWithSidebar>
  )
}
