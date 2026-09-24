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
import { STATEMENT_TYPE_LABELS } from '../../../../../domain/entities/statement'
import FigureAvatar from '../../../../../components/figures/FigureAvatar'
import AdminMenu from '../../../../../components/ui/AdminMenu'
import Button from '../../../../../components/ui/Button'
import ShareButton from '../../../../../components/ui/ShareButton'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import { formatShortDate } from '../../../../../lib/format-date'
import { plural } from '../../../../../lib/plural'
import MergePositionForm from './MergePositionForm'
import PositionHero from './PositionHero'
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
    .map((p) => ({ id: p.id, title: p.title, slug: p.slug }))

  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_position')
  const isAdmin = !!contributor && canPerform(contributor.reputation, 'admin')

  const figuresCount = new Set(positionStatements.map(({ publicFigure }) => publicFigure.id)).size

  return (
    <>
      <PositionHero
        subject={subject}
        title={position.title}
        description={position.description}
        counts={{ statements: positionStatements.length, figures: figuresCount }}
        adminMenu={
          (canEdit || isAdmin) && (
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
          )
        }
        actions={
          <>
            {contributor ? (
              <Button
                href={`/nouvelle-prise-de-position?subjectId=${subject.id}&subjectTitle=${encodeURIComponent(subject.title)}&positionId=${position.id}`}
              >
                Ajouter une prise de position
              </Button>
            ) : (
              <Button href="/contribuer">Ajouter une prise de position</Button>
            )}
            <ShareButton
              compact
              title={`${position.title} — ${subject.title}`}
              text={position.description}
            />
          </>
        }
      />

      <ContentWithSidebar
        topMargin
        aside={
          <div className={styles.subjectCard}>
            <p className={styles.subjectCardTitle}>Le sujet</p>
            <Link href={`/s/${slug}`} className={styles.subjectCardName}>
              {subject.title}
            </Link>
            <p className={styles.subjectCardProblem}>{subject.problem}</p>
            {otherPositions.length > 0 && (
              <>
                <p className={styles.subjectCardTitle}>Les autres positions</p>
                <ul className={styles.otherPositions}>
                  {otherPositions.map((other) => (
                    <li key={other.id} className={styles.otherPosition}>
                      <Link
                        href={`/s/${slug}/position/${other.slug}`}
                        className={styles.otherPositionLink}
                      >
                        {other.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>
        }
      >
        <section>
          <header className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {positionStatements.length}{' '}
              {plural(positionStatements.length, 'prise de position', 'prises de position')}
            </h2>
          </header>

          {positionStatements.length === 0 ? (
            <p className={styles.empty}>
              Aucune prise de position enregistrée pour cette position.
            </p>
          ) : (
            <div className={styles.list}>
              {positionStatements.map(({ statement, publicFigure }) => (
                <article key={statement.id} className={styles.card}>
                  <Link href={`/p/${publicFigure.slug}/s/${slug}`}>
                    <FigureAvatar slug={publicFigure.slug} name={publicFigure.name} size={44} />
                  </Link>
                  <div className={styles.body}>
                    <div className={styles.head}>
                      <Link href={`/p/${publicFigure.slug}/s/${slug}`} className={styles.figure}>
                        {publicFigure.name}
                      </Link>
                      <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
                    </div>
                    <blockquote className={styles.quote}>{statement.quote}</blockquote>
                    <div className={styles.source}>
                      <span className={styles.type}>
                        {STATEMENT_TYPE_LABELS[statement.statementType]}
                      </span>
                      {statement.sourceUrl ? (
                        <a
                          href={statement.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                        >
                          {statement.sourceName}
                        </a>
                      ) : (
                        <span className={styles.sourceLink}>{statement.sourceName}</span>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </ContentWithSidebar>
    </>
  )
}
