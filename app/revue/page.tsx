import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import { viewerOf } from '../../domain/read-models/review'
import {
  parseReviewQueuePage,
  REVIEW_QUEUE_PAGE_SIZE,
  reviewQueueHref,
  reviewQueueRange,
} from '../../domain/read-models/review-queue'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import ReadingGuide from '../../components/layout/ReadingGuide'
import ReviewScope from '../../components/review/ReviewScope'
import FeedEntry from '../../components/statements/FeedEntry'
import Button from '../../components/ui/Button'
import { plural } from '../../lib/plural'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import styles from './revue.module.css'

const INTRO =
  'Les prises de position que personne n’a encore relues, des dernières ajoutées aux plus anciennes.'

export const metadata: Metadata = {
  title: 'Revue',
  description: INTRO,
}

interface PageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function ReviewQueuePage({ searchParams }: PageProps) {
  const page = parseReviewQueuePage((await searchParams).page)
  const contributor = await getAuthenticatedContributor()
  const queue = await Effect.runPromise(
    createStatementRepository(createAdminSupabaseClient()).findToReview(contributor?.id ?? null, {
      limit: REVIEW_QUEUE_PAGE_SIZE,
      offset: (page - 1) * REVIEW_QUEUE_PAGE_SIZE,
    }),
  )
  const { shownUpTo, hasMore } = reviewQueueRange(page, queue.total)

  return (
    <>
      <PageHero
        kicker="Contribuer"
        title="Revue"
        intro={INTRO}
        aside={
          queue.total > 0 && (
            <p className={styles.count}>
              <span className={styles.countNumber}>{queue.total.toLocaleString('fr-FR')}</span>
              <span className={styles.countLabel}>
                {plural(queue.total, 'prise de position à relire', 'prises de position à relire')}
              </span>
            </p>
          )
        }
      />

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <ReadingGuide
            title="Relire une prise de position"
            steps={[
              <>
                Ouvrez la <strong>source</strong> et lisez.
              </>,
              <>
                Si la prise de position y figure bien, <strong>confirmez-la</strong> d’un clic sur
                la coche, au bout de la ligne de source.
              </>,
              <>
                Sinon, <strong>signalez</strong> ce qui cloche.
              </>,
            ]}
          />
        }
      >
        {queue.entries.length === 0 ? (
          <p className={styles.empty}>
            {page > 1
              ? 'Il n’y a plus de prise de position à relire.'
              : 'Toutes les prises de position ont été relues.'}
          </p>
        ) : (
          // Nothing listed here was confirmed nor flagged: the scope opens without marks
          <ReviewScope marks={{}} viewer={viewerOf(contributor)}>
            <div className={styles.card}>
              {queue.entries.map((entry) => (
                <FeedEntry key={entry.statement.id} entry={entry} />
              ))}
            </div>
          </ReviewScope>
        )}

        {queue.total > 0 && (
          <div className={styles.footer}>
            <p className={styles.range}>
              {shownUpTo} sur {queue.total}
            </p>
            {hasMore && (
              <Button href={reviewQueueHref(page + 1)} variant="secondary">
                Voir les suivantes
              </Button>
            )}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
