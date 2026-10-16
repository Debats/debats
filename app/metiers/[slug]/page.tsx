import { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../../infra/supabase/admin'
import { createOccupationRepository } from '../../../infra/database/occupation-repository-supabase'
import { createOccupationFamilyRepository } from '../../../infra/database/occupation-family-repository-supabase'
import { createPublicFigureRepository } from '../../../infra/database/public-figure-repository-supabase'
import { PublicFigureActivitySummary } from '../../../domain/value-objects/public-figure-activity-summary'
import ContentWithSidebar from '../../../components/layout/ContentWithSidebar'
import PageHero from '../../../components/layout/PageHero'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import { plural } from '../../../lib/plural'
import styles from './occupation-family.module.css'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  try {
    const supabase = createAdminSupabaseClient()
    const family = await Effect.runPromise(
      createOccupationFamilyRepository(supabase).findBySlug(slug),
    )
    if (!family) return { title: 'Famille de métiers introuvable' }
    return {
      title: `${family.name} — Métiers`,
      description: family.description || `Les personnalités référencées comme ${family.name}.`,
    }
  } catch {
    return { title: 'Métiers' }
  }
}

interface OccupationSection {
  id: string
  name: string
  figures: PublicFigureActivitySummary[]
}

export default async function OccupationFamilyPage({ params }: PageProps) {
  const { slug } = await params

  const supabase = createAdminSupabaseClient()
  const occupationRepo = createOccupationRepository(supabase)
  const figureRepo = createPublicFigureRepository(supabase)

  const family = await Effect.runPromise(
    createOccupationFamilyRepository(supabase).findBySlug(slug),
  )
  if (!family) notFound()

  const occupations = (await Effect.runPromise(occupationRepo.findAll())).filter(
    (o) => o.familyId === family.id,
  )
  const sections: OccupationSection[] = await Promise.all(
    occupations.map(async (occupation) => {
      const ids = await Effect.runPromise(
        occupationRepo.findPublicFigureIdsByOccupationId(occupation.id),
      )
      const figures = await Effect.runPromise(figureRepo.findSummariesByIds(ids))
      return { id: occupation.id, name: occupation.name, figures }
    }),
  )
  const populated = sections.filter((section) => section.figures.length > 0)
  const total = new Set(populated.flatMap((s) => s.figures.map((f) => f.id))).size

  return (
    <>
      <PageHero
        kicker="Famille de métiers"
        title={family.name}
        intro={
          family.description ||
          `${total} ${plural(total, 'personnalité référencée', 'personnalités référencées')} · ${occupations.map((o) => o.name).join(', ')}`
        }
      />
      <ContentWithSidebar topMargin>
        {populated.length === 0 ? (
          <p className={styles.empty}>Aucune personnalité n’a encore un métier de cette famille.</p>
        ) : (
          <div className={styles.sections}>
            {populated.map((section) => (
              <section key={section.id} className={styles.section}>
                <h2 className={styles.title}>{section.name}</h2>
                <div className={styles.grid}>
                  {section.figures.map((figure) => (
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
              </section>
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
