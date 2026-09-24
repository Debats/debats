import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../../../../infra/database/public-figure-repository-supabase'
import { createSubjectRepository } from '../../../../../infra/database/subject-repository-supabase'
import { createStatementRepository } from '../../../../../infra/database/statement-repository-supabase'
import {
  StatementWithDetails,
  StatementWithFigure,
} from '../../../../../domain/repositories/statement-repository'
import { STATEMENT_TYPE_LABELS } from '../../../../../domain/entities/statement'
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../domain/reputation/permissions'
import EditLink from '../../../../../components/ui/EditLink'
import ShareButton from '../../../../../components/ui/ShareButton'
import FigureAvatarStack from '../../../../../components/figures/FigureAvatarStack'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
import { formatShortDate } from '../../../../../lib/format-date'
import { plural } from '../../../../../lib/plural'
import FigureSubjectHero from './FigureSubjectHero'
import styles from './figure-subject.module.css'

interface PageProps {
  params: Promise<{ slug: string; subjectSlug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, subjectSlug } = await params
  try {
    const supabase = createAdminSupabaseClient()
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
    (acc, { statement, position }) => {
      if (!acc[position.id]) {
        acc[position.id] = { position, statements: [] }
      }
      acc[position.id].statements.push(statement)
      return acc
    },
    {} as Record<
      string,
      {
        position: StatementWithDetails['position']
        statements: StatementWithDetails['statement'][]
      }
    >,
  )
}

interface FigureSummary {
  id: string
  name: string
  slug: string
}

interface PositionGroup {
  title: string
  slug: string
  figures: FigureSummary[]
}

function groupOtherFigures(
  subjectStatements: StatementWithFigure[],
  currentFigureId: string,
  currentPositionIds: Set<string>,
): { alliesByPosition: Map<string, FigureSummary[]>; opponents: PositionGroup[] } {
  const alliesMap = new Map<string, Map<string, FigureSummary>>()
  const opponentsMap = new Map<
    string,
    { title: string; slug: string; figures: Map<string, FigureSummary> }
  >()

  for (const { publicFigure, position } of subjectStatements) {
    if (publicFigure.id === currentFigureId) continue

    const summary: FigureSummary = {
      id: publicFigure.id,
      name: publicFigure.name,
      slug: publicFigure.slug,
    }

    if (currentPositionIds.has(position.id)) {
      if (!alliesMap.has(position.id)) alliesMap.set(position.id, new Map())
      const posMap = alliesMap.get(position.id)!
      if (!posMap.has(publicFigure.id)) posMap.set(publicFigure.id, summary)
    } else {
      if (!opponentsMap.has(position.id)) {
        opponentsMap.set(position.id, {
          title: position.title,
          slug: position.slug,
          figures: new Map(),
        })
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
    .map((g) => ({ title: g.title, slug: g.slug, figures: Array.from(g.figures.values()) }))
    .sort((a, b) => b.figures.length - a.figures.length)

  return { alliesByPosition, opponents }
}

export default async function FigureSubjectPage({ params }: PageProps) {
  const { slug, subjectSlug } = await params

  const supabase = createAdminSupabaseClient()
  const figureRepo = createPublicFigureRepository(supabase)
  const subjectRepo = createSubjectRepository(supabase)
  const statementRepo = createStatementRepository(supabase)

  const [figure, subject] = await Promise.all([
    Effect.runPromise(figureRepo.findBySlug(slug)),
    Effect.runPromise(subjectRepo.findBySlug(subjectSlug)),
  ])

  if (!figure || !subject) notFound()

  const [figureStatements, subjectStatements, contributor] = await Promise.all([
    Effect.runPromise(statementRepo.findByPublicFigureAndSubject(figure.id, subject.id)),
    Effect.runPromise(statementRepo.findBySubjectWithFigures(subject.id)),
    getAuthenticatedContributor(),
  ])

  const canEdit = !!contributor && canPerform(contributor.reputation, 'edit_statement')

  const positions = Object.values(groupByPosition(figureStatements))
  const currentPositionIds = new Set(positions.map(({ position }) => position.id))
  const { alliesByPosition, opponents } = groupOtherFigures(
    subjectStatements,
    figure.id,
    currentPositionIds,
  )
  const alliesCount = new Set(
    Array.from(alliesByPosition.values()).flatMap((figures) => figures.map((f) => f.id)),
  ).size

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
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <FigureSubjectHero
        figure={figure}
        subject={subject}
        counts={{
          statements: figureStatements.length,
          positions: positions.length,
          allies: alliesCount,
        }}
        actions={<ShareButton compact title={`${figure.name} sur ${subject.title}`} />}
      />

      <ContentWithSidebar
        topMargin
        aside={
          <div className={styles.subjectCard}>
            <p className={styles.subjectCardTitle}>Le sujet</p>
            <Link href={`/s/${subject.slug}`} className={styles.subjectCardName}>
              {subject.title}
            </Link>
            <p className={styles.subjectCardProblem}>{subject.problem}</p>
            <Link href={`/s/${subject.slug}`} className={styles.subjectCardLink}>
              Voir toutes les positions
            </Link>
          </div>
        }
      >
        <section>
          <header className={styles.sectionHead}>
            <h2 className={styles.sectionTitle}>
              {figureStatements.length}{' '}
              {plural(figureStatements.length, 'prise de position', 'prises de position')}
            </h2>
          </header>

          {positions.length === 0 ? (
            <p className={styles.empty}>Aucune prise de position enregistrée pour l’instant.</p>
          ) : (
            <div className={styles.list}>
              {positions.map(({ position, statements }) => {
                const allies = alliesByPosition.get(position.id) ?? []
                return (
                  <article key={position.id} className={styles.card}>
                    <p className={styles.kicker}>Sa position</p>
                    <h3 className={styles.positionTitle}>
                      <Link
                        href={`/s/${subjectSlug}/position/${position.slug}`}
                        className={styles.positionLink}
                      >
                        {position.title}
                      </Link>
                    </h3>
                    {statements.map((statement) => (
                      <div key={statement.id} className={styles.statement}>
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
                          <span className={styles.separator}>·</span>
                          <span className={styles.date}>{formatShortDate(statement.statedAt)}</span>
                          {canEdit && (
                            <EditLink
                              href={`/p/${slug}/s/${subjectSlug}/modifier/${statement.id}`}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                    {allies.length > 0 && (
                      <div className={styles.allies}>
                        <span className={styles.alliesLabel}>Même position</span>
                        <FigureAvatarStack
                          figures={allies}
                          max={10}
                          size={36}
                          hrefSuffix={`/s/${subject.slug}`}
                        />
                      </div>
                    )}
                  </article>
                )
              })}
            </div>
          )}
        </section>

        {opponents.length > 0 && (
          <section className={styles.others}>
            <header className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Positions différentes</h2>
            </header>
            <div className={styles.list}>
              {opponents.map((group) => (
                <div key={group.slug} className={styles.otherCard}>
                  <Link
                    href={`/s/${subject.slug}/position/${group.slug}`}
                    className={styles.otherTitle}
                  >
                    {group.title}
                  </Link>
                  <FigureAvatarStack
                    figures={group.figures}
                    max={8}
                    size={36}
                    hrefSuffix={`/s/${subject.slug}`}
                  />
                </div>
              ))}
            </div>
          </section>
        )}
      </ContentWithSidebar>
    </>
  )
}
