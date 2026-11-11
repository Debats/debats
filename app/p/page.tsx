import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { PublicFigureActivitySummary } from '../../domain/value-objects/public-figure-activity-summary'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import { figureHref } from '../../domain/read-models/hrefs'
import Button from '../../components/ui/Button'
import FigureAvatar from '../../components/figures/FigureAvatar'
import PersonalitySearch from '../../components/figures/PersonalitySearch'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import { formatRelativeDate } from '../../lib/format-date'
import { plural } from '../../lib/plural'
import styles from './personalities.module.css'

export const metadata: Metadata = {
  title: 'Personnalités',
  description:
    'Les personnalités publiques référencées sur Débats.co et leurs prises de position sur les sujets de société.',
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function FigureCard({ figure, stat }: { figure: PublicFigureActivitySummary; stat: string }) {
  return (
    <Link href={figureHref(figure.slug)} className={styles.figureCard}>
      <FigureAvatar slug={figure.slug} name={figure.name} size={80} />
      <h3 className={styles.figureName}>{figure.name}</h3>
      <span className={styles.figureStat}>{stat}</span>
    </Link>
  )
}

function FigureRow({ figure }: { figure: PublicFigureActivitySummary }) {
  return (
    <div className={styles.figureRow}>
      <FigureAvatar slug={figure.slug} name={figure.name} size={48} />
      <div className={styles.figureRowInfo}>
        <Link href={figureHref(figure.slug)} className={styles.figureRowName}>
          {figure.name}
        </Link>
        <span className={styles.figureRowStat}>
          {figure.subjectsCount} {plural(figure.subjectsCount, 'sujet', 'sujets')}
        </span>
      </div>
    </div>
  )
}

interface PageProps {
  searchParams: Promise<{ lettre?: string }>
}

export default async function PersonalitiesPage({ searchParams }: PageProps) {
  const { lettre } = await searchParams
  const supabase = createAdminSupabaseClient()
  const repo = createPublicFigureRepository(supabase)

  const contributor = await getAuthenticatedContributor()
  const canAddPersonality = contributor
    ? canPerform(contributor.reputation, 'add_personality')
    : false

  // Un seul jour pour toute la page, comme ailleurs
  const today = new Date()
  const [mostActive, recentlyActive, letterFigures] = await Promise.all([
    Effect.runPromise(repo.findSummariesByActivity(10, 'subjects_count')),
    Effect.runPromise(repo.findSummariesByActivity(10, 'latest_statement_at')),
    lettre ? Effect.runPromise(repo.findByLetter(lettre)) : Promise.resolve(null),
  ])

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les personnalités"
        intro="Élu·es, responsables, chercheur·es, artistes : qui a pris position, sur quoi, et sur quelles bases."
        actions={canAddPersonality && <Button href="/p/ajouter">Ajouter une personnalité</Button>}
      >
        <PersonalitySearch />
      </PageHero>

      <ContentWithSidebar topMargin>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Les plus actives</h2>
          <div className={styles.figureGrid}>
            {mostActive.map((figure) => (
              <FigureCard
                key={figure.id}
                figure={figure}
                stat={`${figure.subjectsCount} ${plural(figure.subjectsCount, 'sujet', 'sujets')}`}
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Activité récente</h2>
          <div className={styles.figureGrid}>
            {recentlyActive.map((figure) => (
              <FigureCard
                key={figure.id}
                figure={figure}
                stat={
                  figure.latestStatementAt
                    ? formatRelativeDate(figure.latestStatementAt, today)
                    : 'Aucune activité'
                }
              />
            ))}
          </div>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Index A-Z</h2>
          <div className={styles.alphabetBar}>
            {ALPHABET.map((l) => (
              <Link
                key={l}
                href={`/p?lettre=${l}`}
                scroll={false}
                className={`${styles.letterLink} ${lettre === l ? styles.letterActive : ''}`}
              >
                {l}
              </Link>
            ))}
          </div>

          {letterFigures && (
            <div className={styles.letterResults}>
              {letterFigures.length === 0 ? (
                <p className={styles.noResults}>Aucune personnalité commençant par « {lettre} ».</p>
              ) : (
                letterFigures.map((figure) => <FigureRow key={figure.id} figure={figure} />)
              )}
            </div>
          )}
        </section>
      </ContentWithSidebar>
    </>
  )
}
