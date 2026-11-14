import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createOccupationRepository } from '../../infra/database/occupation-repository-supabase'
import {
  FEED_PAGE_SIZE,
  FeedOrder,
  feedHref,
  lastTouch,
  parseFeedParams,
} from '../../domain/read-models/statement-feed'
import { roleOf, rolesByFigure } from '../../domain/read-models/author-role'
import { subjectHref } from '../../domain/read-models/hrefs'
import { authorOnSubjectHref } from '../../domain/read-models/statement-author'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import ReadingGuide from '../../components/layout/ReadingGuide'
import ReviewScope from '../../components/review/ReviewScope'
import DatedStatement from '../../components/statements/DatedStatement'
import Button from '../../components/ui/Button'
import { plural } from '../../lib/plural'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { reviewOf } from '../review-of'
import FeedFilters from './FeedFilters'
import ActiveSubjects from './ActiveSubjects'
import styles from './prises-de-position.module.css'

/** How the feed runs in each order, as the hero says it */
const ORDER_SPANS: Record<FeedOrder, string> = {
  stated: 'des plus récentes aux plus anciennes',
  touched: 'des dernières ajoutées ou modifiées sur le site aux plus anciennes',
}

const introOf = (order: FeedOrder) =>
  `Toutes les prises de position sourcées, ${ORDER_SPANS[order]}. Chaque entrée renvoie à sa source d’origine.`

export const metadata: Metadata = {
  title: 'Prises de position',
  description: introOf('stated'),
}

const ACTIVE_SUBJECTS = 6

interface PageProps {
  searchParams: Promise<{
    qui?: string
    theme?: string
    type?: string
    tri?: string
    page?: string
  }>
}

export default async function StatementsFeedPage({ searchParams }: PageProps) {
  const { filters, order, page } = parseFeedParams(await searchParams)

  const supabase = createAdminSupabaseClient()
  const [feed, themes, activeSubjects] = await Promise.all([
    Effect.runPromise(
      createStatementRepository(supabase).findFeed(filters, order, {
        limit: FEED_PAGE_SIZE,
        offset: (page - 1) * FEED_PAGE_SIZE,
      }),
    ),
    Effect.runPromise(createThemeRepository(supabase).findAll()),
    Effect.runPromise(createSubjectRepository(supabase).findSummariesByActivity(ACTIVE_SUBJECTS)),
  ])
  const figureIds = Array.from(
    new Set(feed.entries.filter((e) => e.author.kind === 'public_figure').map((e) => e.author.id)),
  )
  const roles = rolesByFigure(
    await Effect.runPromise(
      createOccupationRepository(supabase).findCurrentHeldByPublicFigureIds(figureIds),
    ),
  )
  const review = await reviewOf(
    supabase,
    await getAuthenticatedContributor(),
    feed.entries.map(({ statement }) => statement.id),
  )
  const shownUpTo = Math.min(page * FEED_PAGE_SIZE, feed.total)
  const hasMore = shownUpTo < feed.total

  return (
    <>
      <PageHero
        kicker="Flux"
        title="Les prises de position"
        intro={introOf(order)}
        aside={
          <p className={styles.count}>
            <span className={styles.countNumber}>{feed.total}</span>
            <span className={styles.countLabel}>
              {plural(feed.total, 'prise de position', 'prises de position')}
            </span>
          </p>
        }
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <ReadingGuide
              title="Lire le flux"
              steps={[
                <>
                  Un avatar <strong>rond</strong> est une personnalité, un logo{' '}
                  <strong>carré</strong> une organisation.
                </>,
                <>
                  Chaque entrée dit <strong>pour quelle position</strong>, sur quel sujet, et
                  renvoie à sa source.
                </>,
                <>Le site ne dit pas qui a raison. Il montre qui dit quoi, et sur quelles bases.</>,
              ]}
            />
            <ActiveSubjects subjects={activeSubjects} />
          </>
        }
      >
        <FeedFilters filters={filters} order={order} themes={themes} />

        {feed.entries.length === 0 ? (
          <p className={styles.empty}>
            {page > 1
              ? 'Il n’y a plus de prise de position à charger.'
              : 'Aucune prise de position ne correspond à ces filtres.'}
          </p>
        ) : (
          <ReviewScope {...review}>
            <div className={styles.card}>
              {feed.entries.map(({ statement, author, position, subject, arguments: used }) => (
                <DatedStatement
                  key={statement.id}
                  author={author}
                  role={roleOf(author, roles)}
                  position={{
                    title: position.title,
                    href: authorOnSubjectHref(author, subject.slug),
                  }}
                  subject={{ title: subject.title, href: subjectHref(subject.slug) }}
                  statement={statement}
                  touch={order === 'touched' ? lastTouch(statement) : undefined}
                  arguments={used}
                />
              ))}
            </div>
          </ReviewScope>
        )}

        {feed.total > 0 && (
          <div className={styles.footer}>
            <p className={styles.range}>
              {shownUpTo} sur {feed.total}
            </p>
            {hasMore && (
              <Button href={feedHref(filters, order, page + 1)} variant="secondary">
                Charger la suite
              </Button>
            )}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
