import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOccupationRepository } from '../../../infra/database/occupation-repository-supabase'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import PageHero from '../../../components/layout/PageHero'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import { plural } from '../../../lib/plural'
import styles from './occupation-detail.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const occupation = await Effect.runPromise(
      createOccupationRepository(supabase).findBySlug(slug),
    )
    if (!occupation) return { title: 'Métier introuvable' }
    return {
      title: `${occupation.name} — Métier`,
      description:
        occupation.description || `Les personnalités référencées comme ${occupation.name}.`,
    }
  } catch {
    return { title: 'Métier' }
  }
}

export default async function OccupationDetailPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const occupationRepo = createOccupationRepository(supabase)

  const occupation = await Effect.runPromise(occupationRepo.findBySlug(slug))
  if (!occupation) notFound()

  const figureIds = await Effect.runPromise(
    occupationRepo.findPublicFigureIdsByOccupationId(occupation.id),
  )
  const figures = await Effect.runPromise(
    createPublicFigureRepository(supabase).findSummariesByIds(figureIds),
  )

  return (
    <>
      <PageHero
        kicker="Métier"
        title={occupation.name}
        intro={
          occupation.description ||
          `${figures.length} ${plural(figures.length, 'personnalité référencée', 'personnalités référencées')}`
        }
      />
      <ContentWithSidebar topMargin>
        {figures.length === 0 ? (
          <p className={styles.empty}>Aucune personnalité n’a encore ce métier.</p>
        ) : (
          <div className={styles.grid}>
            {figures.map((figure) => (
              <Link key={figure.id} href={`/p/${figure.slug}`} className={styles.card}>
                <FigureAvatar slug={figure.slug} name={figure.name} size={80} />
                <span className={styles.name}>{figure.name}</span>
                <span className={styles.stat}>
                  {figure.statementsCount}{' '}
                  {plural(figure.statementsCount, 'prise de position', 'prises de position')}
                </span>
              </Link>
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
