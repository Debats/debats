import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createPublicFigureRepository } from '../../infra/database/public-figure-repository-supabase'
import { PublicFigureActivitySummary } from '../../domain/value-objects/public-figure-activity-summary'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import Button from '../../components/ui/Button'
import FigureAvatar from '../../components/figures/FigureAvatar'
import PersonalitySearch from '../../components/figures/PersonalitySearch'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import styles from './personalities.module.css'

export const metadata: Metadata = {
  title: 'Personnalités',
  description:
    'Les personnalités publiques référencées sur Débats.co et leurs prises de position sur les sujets de société.',
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

function formatRelativeDate(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "Aujourd'hui"
  if (diffDays === 1) return 'Hier'
  if (diffDays < 30) return `Il y a ${diffDays} jours`
  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) return `Il y a ${diffMonths} mois`
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function FigureCard({ figure, stat }: { figure: PublicFigureActivitySummary; stat: string }) {
  return (
    <Link href={`/p/${figure.slug}`} className={styles.figureCard}>
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
        <Link href={`/p/${figure.slug}`} className={styles.figureRowName}>
          {figure.name}
        </Link>
        <span className={styles.figureRowStat}>
          {figure.subjectsCount} sujet{figure.subjectsCount !== 1 ? 's' : ''}
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
  const supabase = await createSSRSupabaseClient()
  const repo = createPublicFigureRepository(supabase)

  const contributor = await getAuthenticatedContributor()
  const canAddPersonality = contributor
    ? canPerform(contributor.reputation, 'add_personality')
    : false

  const [mostActive, recentlyActive, letterFigures] = await Promise.all([
    Effect.runPromise(repo.findSummariesByActivity(10, 'subjects_count')),
    Effect.runPromise(repo.findSummariesByActivity(10, 'latest_statement_at')),
    lettre ? Effect.runPromise(repo.findByLetter(lettre)) : Promise.resolve(null),
  ])

  return (
    <ContentWithSidebar topMargin>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>LES PERSONNALITÉS</h1>
        {canAddPersonality && (
          <Button href="/p/ajouter" size="small">
            Ajouter une personnalité
          </Button>
        )}
      </div>

      <PersonalitySearch />

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Les plus actives</h2>
        <div className={styles.figureGrid}>
          {mostActive.map((figure) => (
            <FigureCard
              key={figure.id}
              figure={figure}
              stat={`${figure.subjectsCount} sujet${figure.subjectsCount !== 1 ? 's' : ''}`}
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
                  ? formatRelativeDate(figure.latestStatementAt)
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
  )
}
