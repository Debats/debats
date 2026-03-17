import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../../../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import {
  StatementWithDetails,
  StatementWithFigure,
} from '../../../../../domain/repositories/statement-repository'
import FigureAvatar from '../../../../../components/figures/FigureAvatar'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import ErrorDisplay from '../../../../../components/layout/ErrorDisplay'
import styles from './figure-subject.module.css'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  try {
    const supabase = await createSSRSupabaseClient()
    const figureRepo = createPublicFigureRepository(supabase)
    const subjectRepo = createSubjectRepository(supabase)

    const [figure, subject] = await Promise.all([
      Effect.runPromise(figureRepo.findBySlug(slug)),
      Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
    ])

    if (!figure || !subject) return { title: 'Page introuvable' }

    const title = `${figure.name} sur ${subject.title}`
    const description = `Prises de position de ${figure.name} sur ${subject.title}.`
    const url = `/p/${slug}/s/${subjectSlug}`
    return {
      title,
      description,
      alternates: { canonical: url },
      openGraph: {
        title,
        description,
        type: 'profile',
        url,
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
      },
    }
  } catch {
    return { title: 'Prises de position' }
  }
}

function groupByPosition(statements: StatementWithDetails[]) {
  return statements.reduce(
    (acc, { statement, position, evidences }) => {
      if (!acc[position.id]) {
        acc[position.id] = { position, statements: [] }
      }
      acc[position.id].statements.push({ statement, evidences })
      return acc
    },
    {} as Record<
      string,
      {
        position: StatementWithDetails['position']
        statements: {
          statement: StatementWithDetails['statement']
          evidences: StatementWithDetails['evidences']
        }[]
      }
    >,
  )
}

interface FigureSummary {
  name: string
  slug: string
}

interface PositionGroup {
  title: string
  figures: FigureSummary[]
}

function groupOtherFigures(
  subjectStatements: StatementWithFigure[],
  currentFigureId: string,
  currentPositionIds: Set<string>,
): { alliesByPosition: Map<string, FigureSummary[]>; opponents: PositionGroup[] } {
  const alliesMap = new Map<string, Map<string, FigureSummary>>()
  const opponentsMap = new Map<string, { title: string; figures: Map<string, FigureSummary> }>()

  for (const { publicFigure, position } of subjectStatements) {
    if (publicFigure.id === currentFigureId) continue

    const summary: FigureSummary = { name: publicFigure.name, slug: publicFigure.slug }

    if (currentPositionIds.has(position.id)) {
      if (!alliesMap.has(position.id)) alliesMap.set(position.id, new Map())
      const posMap = alliesMap.get(position.id)!
      if (!posMap.has(publicFigure.id)) posMap.set(publicFigure.id, summary)
    } else {
      if (!opponentsMap.has(position.id)) {
        opponentsMap.set(position.id, { title: position.title, figures: new Map() })
      }
      const group = opponentsMap.get(position.id)!
      if (!group.figures.has(publicFigure.id)) group.figures.set(publicFigure.id, summary)
    }
  }

  const alliesByPosition = new Map<string, FigureSummary[]>()
  Array.from(alliesMap.entries()).forEach(([posId, figMap]) => {
    alliesByPosition.set(posId, Array.from(figMap.values()))
  })

  const opponents = Array.from(opponentsMap.values())
    .map((g) => ({ title: g.title, figures: Array.from(g.figures.values()) }))
    .sort((a, b) => b.figures.length - a.figures.length)

  return { alliesByPosition, opponents }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default async function FigureSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  try {
    const supabase = await createSSRSupabaseClient()
    const figureRepo = createPublicFigureRepository(supabase)
    const subjectRepo = createSubjectRepository(supabase)
    const statementRepo = createStatementRepository(supabase)

    const [figure, subject] = await Promise.all([
      Effect.runPromise(figureRepo.findBySlug(slug)),
      Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
    ])

    if (!figure || !subject) notFound()

    const [statements, subjectStatements] = await Promise.all([
      Effect.runPromise(statementRepo.findByPublicFigureAndSubject(figure.id, subject.id)),
      Effect.runPromise(statementRepo.findBySubjectWithFigures(subject.id)),
    ])

    const positionsMap = groupByPosition(statements)
    const positions = Object.values(positionsMap)

    const currentPositionIds = new Set(positions.map(({ position }) => position.id))
    const { alliesByPosition, opponents } = groupOtherFigures(
      subjectStatements,
      figure.id,
      currentPositionIds,
    )

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: `${figure.name} sur ${subject.title}`,
      description: `Prises de position de ${figure.name} sur ${subject.title}.`,
      url: `https://debats.co/p/${figure.slug}/s/${subject.slug}`,
      image: `https://debats.co/avatars/${figure.slug}.jpg`,
      author: { '@type': 'Organization', name: 'Débats.co', url: 'https://debats.co' },
      about: { '@type': 'Thing', name: subject.title },
      mentions: { '@type': 'Person', name: figure.name },
    }

    return (
      <ContentWithSidebar topMargin>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <nav className={styles.breadcrumb}>
          <Link href={`/p/${figure.slug}`} className={styles.breadcrumbLink}>
            {figure.name}
          </Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href={`/s/${subject.slug}`} className={styles.breadcrumbLink}>
            {subject.title}
          </Link>
        </nav>

        <header className={styles.header}>
          <FigureAvatar slug={figure.slug} name={figure.name} size={100} />
          <div>
            <Link href={`/p/${figure.slug}`} className={styles.figureName}>
              {figure.name}
            </Link>
            <p className={styles.subjectTitle}>
              sur{' '}
              <Link href={`/s/${subject.slug}`} className={styles.subjectLink}>
                {subject.title}
              </Link>
            </p>
          </div>
        </header>

        <section>
          <h2 className={styles.sectionTitle}>
            <span className={styles.count}>{statements.length}</span>{' '}
            {statements.length === 1 ? 'PRISE DE POSITION' : 'PRISES DE POSITION'}
          </h2>

          {positions.length === 0 ? (
            <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
          ) : (
            <div>
              {positions.map(({ position, statements: posStatements }) => (
                <div key={position.id} className={styles.positionCard}>
                  <span className={styles.positionLabel}>Sa position</span>
                  <h3 className={styles.positionTitle}>{position.title}</h3>
                  {posStatements.flatMap(({ evidences }) =>
                    evidences.map((evidence) => (
                      <div key={evidence.id} className={styles.evidenceItem}>
                        <blockquote className={styles.quote}>{evidence.quote}</blockquote>
                        <div className={styles.evidenceMeta}>
                          {evidence.sourceUrl ? (
                            <a
                              href={evidence.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className={styles.sourceLink}
                            >
                              {evidence.sourceName}
                            </a>
                          ) : (
                            <span className={styles.sourceLink}>{evidence.sourceName}</span>
                          )}
                          <span className={styles.metaSeparator}>&mdash;</span>
                          {formatDate(evidence.factDate)}
                        </div>
                      </div>
                    )),
                  )}
                  {(alliesByPosition.get(position.id)?.length ?? 0) > 0 && (
                    <div className={styles.allies}>
                      <span className={styles.alliesLabel}>Même position :</span>
                      <div className={styles.figuresRow}>
                        {alliesByPosition.get(position.id)!.map((f) => (
                          <Link
                            key={f.slug}
                            href={`/p/${f.slug}/s/${subject.slug}`}
                            className={styles.figureLink}
                            title={f.name}
                          >
                            <FigureAvatar slug={f.slug} name={f.name} size={40} />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        {opponents.length > 0 && (
          <section className={styles.otherFigures}>
            <h2 className={styles.sectionTitle}>POSITIONS DIFFÉRENTES</h2>
            {opponents.map((group) => (
              <div key={group.title} className={styles.figureGroup}>
                <h3 className={styles.figureGroupTitle}>{group.title}</h3>
                <div className={styles.figuresRow}>
                  {group.figures.map((f) => (
                    <Link
                      key={f.slug}
                      href={`/p/${f.slug}/s/${subject.slug}`}
                      className={styles.figureLink}
                      title={f.name}
                    >
                      <FigureAvatar slug={f.slug} name={f.name} size={50} />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </section>
        )}
      </ContentWithSidebar>
    )
  } catch (error) {
    return (
      <ErrorDisplay
        title="Erreur"
        message="Impossible de charger les prises de position."
        detail={error instanceof Error ? error.message : 'Erreur inconnue'}
      />
    )
  }
}
