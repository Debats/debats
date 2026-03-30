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
import { getAuthenticatedContributor } from '../../../../actions/get-authenticated-contributor'
import { canPerform } from '../../../../../domain/reputation/permissions'
import EditLink from '../../../../../components/ui/EditLink'
import LinkedTitle from '../../../../../components/ui/LinkedTitle'
import HeaderActions from '../../../../../components/layout/HeaderActions'
import ShareButton from '../../../../../components/ui/ShareButton'
import FigureAvatar from '../../../../../components/figures/FigureAvatar'
import FigureAvatarRow from '../../../../../components/figures/FigureAvatarRow'
import ContentWithSidebar from '../../../../../components/layout/ContentWithSidebar'
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

    const summary: FigureSummary = { name: publicFigure.name, slug: publicFigure.slug }

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

function formatDate(date: Date): string {
  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
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

  const positionsMap = groupByPosition(figureStatements)
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
          <HeaderActions>
            <ShareButton title={`${figure.name} sur ${subject.title}`} />
          </HeaderActions>
        </div>
      </header>

      <section>
        <h2 className={styles.sectionTitle}>
          <span className={styles.count}>{figureStatements.length}</span>{' '}
          {figureStatements.length === 1 ? 'PRISE DE POSITION' : 'PRISES DE POSITION'}
        </h2>

        {positions.length === 0 ? (
          <p className={styles.emptyMessage}>Aucune prise de position enregistrée.</p>
        ) : (
          <div>
            {positions.map(({ position, statements: posStatements }) => (
              <div key={position.id} className={styles.positionCard}>
                <span className={styles.positionLabel}>Sa position</span>
                <LinkedTitle
                  href={`/s/${subjectSlug}/position/${position.slug}`}
                  className={styles.positionTitle}
                >
                  {position.title}
                </LinkedTitle>
                {posStatements.map((st) => (
                  <div key={st.id} className={styles.statementItem}>
                    <blockquote className={styles.quote}>{st.quote}</blockquote>
                    <div className={styles.statementMeta}>
                      {st.sourceUrl ? (
                        <a
                          href={st.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                        >
                          {st.sourceName}
                        </a>
                      ) : (
                        <span className={styles.sourceLink}>{st.sourceName}</span>
                      )}
                      <span className={styles.metaSeparator}>&mdash;</span>
                      {formatDate(st.statedAt)}
                      {canEdit && (
                        <>
                          <span className={styles.metaSeparator}>&mdash;</span>
                          <EditLink href={`/p/${slug}/s/${subjectSlug}/modifier/${st.id}`} />
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {(alliesByPosition.get(position.id)?.length ?? 0) > 0 && (
                  <div className={styles.allies}>
                    <span className={styles.alliesLabel}>Même position :</span>
                    <FigureAvatarRow
                      figures={alliesByPosition
                        .get(position.id)!
                        .map((f) => ({ id: f.slug, name: f.name, slug: f.slug }))}
                      size={40}
                      hrefSuffix={`/s/${subject.slug}`}
                    />
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
              <LinkedTitle
                href={`/s/${subject.slug}/position/${group.slug}`}
                className={styles.figureGroupTitle}
              >
                {group.title}
              </LinkedTitle>
              <FigureAvatarRow
                figures={group.figures.map((f) => ({ id: f.slug, name: f.name, slug: f.slug }))}
                size={50}
                hrefSuffix={`/s/${subject.slug}`}
              />
            </div>
          ))}
        </section>
      )}
    </ContentWithSidebar>
  )
}
