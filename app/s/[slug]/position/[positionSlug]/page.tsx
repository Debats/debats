import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createPositionRepository } from '../../../../../infra/database/position-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import { canPerform } from '../../../../../domain/reputation/permissions'
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import FigureAvatar from '../../../../../components/figures/FigureAvatar'
import AdminMenu from '../../../../../components/ui/AdminMenu'
import Button from '../../../../../components/ui/Button'
import HeaderActions from '../../../../../components/layout/HeaderActions'
import ShareButton from '../../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import MergePositionForm from './MergePositionForm'
import styles from './position-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string; positionSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, positionSlug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const subjectRepo = createSubjectRepository(supabase)
    const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
    if (!subject) return { title: 'Position introuvable' }
    const positionRepo = createPositionRepository(supabase)
    const position = await Effect.runPromise(
      positionRepo.findBySubjectAndSlug(subject.id, positionSlug),
    )
    if (!position) return { title: 'Position introuvable' }
    return {
      title: `${position.title} — ${subject.title}`,
      description: position.description,
    }
  } catch {
    return { title: 'Position' }
  }
}

export default async function PositionDetailPage({ params }: PageProps) {
  const { slug, positionSlug } = await params

  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const positionRepo = createPositionRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const subject = await Effect.runPromise(subjectRepo.findBySlug(slug))
  if (!subject) notFound()

  const [position, contributor] = await Promise.all([
    Effect.runPromise(positionRepo.findBySubjectAndSlug(subject.id, positionSlug)),
    getAuthenticatedContributor(),
  ])

  if (!position) notFound()

  const positionStatements = await Effect.runPromise(
    statementRepo.findByPositionIdWithFigures(position.id),
  )

  const allPositions = await Effect.runPromise(positionRepo.findBySubjectId(subject.id))
  const otherPositions = allPositions
    .filter((p) => p.id !== position.id)
    .map((p) => ({ id: p.id, title: p.title }))

  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_position')
  const isAdmin = !!contributor && canPerform(contributor.reputation, 'admin')

  return (
    <ContentWithSidebar topMargin>
      <nav className={styles.breadcrumb}>
        <Link href={`/s/${slug}`} className={styles.breadcrumbLink}>
          {subject.title}
        </Link>
        <span className={styles.breadcrumbSeparator}>/</span>
        <span>{position.title}</span>
      </nav>

      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{position.title}</h1>
          {(canEdit || isAdmin) && (
            <AdminMenu
              actions={[
                ...(canEdit
                  ? [
                      {
                        label: 'Modifier',
                        icon: '✎',
                        href: `/s/${slug}/position/${positionSlug}/modifier`,
                      },
                    ]
                  : []),
              ]}
            >
              {isAdmin && otherPositions.length > 0 && (
                <MergePositionForm
                  sourcePositionId={position.id}
                  subjectSlug={slug}
                  otherPositions={otherPositions}
                />
              )}
            </AdminMenu>
          )}
        </div>
        <p className={styles.description}>{position.description}</p>
        <HeaderActions>
          <ShareButton title={`${position.title} — ${subject.title}`} text={position.description} />
        </HeaderActions>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>
          PRISES DE POSITION <span className={styles.count}>{positionStatements.length}</span>
        </h2>

        {positionStatements.length === 0 ? (
          <p className={styles.empty}>Aucune prise de position enregistrée pour cette position.</p>
        ) : (
          <div className={styles.statementsList}>
            {positionStatements.map(({ statement, publicFigure }) => (
              <div key={statement.id} className={styles.statementItem}>
                <div className={styles.figureInfo}>
                  <Link href={`/p/${publicFigure.slug}/s/${slug}`}>
                    <FigureAvatar slug={publicFigure.slug} name={publicFigure.name} size={48} />
                  </Link>
                  <div>
                    <Link href={`/p/${publicFigure.slug}/s/${slug}`} className={styles.figureName}>
                      {publicFigure.name}
                    </Link>
                    <span className={styles.statementDate}>
                      {statement.statedAt.toLocaleDateString('fr-FR')}
                    </span>
                  </div>
                </div>
                <blockquote className={styles.quote}>{statement.quote}</blockquote>
                {statement.sourceUrl ? (
                  <a
                    href={statement.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.source}
                  >
                    {statement.sourceName}
                  </a>
                ) : (
                  <span className={styles.source}>{statement.sourceName}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {contributor && (
        <div className={styles.actions}>
          <Button
            href={`/nouvelle-prise-de-position?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}&positionId=${position.id}`}
            size="small"
          >
            Ajouter une prise de position
          </Button>
        </div>
      )}
    </ContentWithSidebar>
  )
}
