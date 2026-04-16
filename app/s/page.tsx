import { Metadata } from 'next'
import Link from 'next/link'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { createThemeRepository } from '../../infra/database/theme-repository-supabase'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import { SubjectActivitySummary } from '../../domain/repositories/subject-repository'
import Button from '../../components/ui/Button'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import SubjectSearch from '../../components/subjects/SubjectSearch'
import styles from './subjects.module.css'

const SUBJECTS_PER_THEME = 5

export const metadata: Metadata = {
  title: 'Sujets',
  description:
    'Tous les sujets de débat référencés sur Débats.co avec les positions et personnalités associées.',
}

interface ThemeSection {
  themeId: string
  themeName: string
  themeSlug: string
  subjects: SubjectActivitySummary[]
  totalCount: number
}

export default async function SubjectsPage() {
  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)
  const themeRepo = createThemeRepository(supabase)

  const contributor = await getAuthenticatedContributor()
  const canAddSubject = contributor ? canPerform(contributor.reputation, 'add_subject') : false

  const [themes, primaryLinks] = await Promise.all([
    Effect.runPromise(themeRepo.findAll()),
    Effect.runPromise(themeRepo.findAllPrimaryLinks()),
  ])

  const subjectIdsByTheme = new Map<string, string[]>()
  for (const link of primaryLinks) {
    const ids = subjectIdsByTheme.get(link.themeId) ?? []
    ids.push(link.subjectId)
    subjectIdsByTheme.set(link.themeId, ids)
  }

  const allSubjectIds = primaryLinks.map((l) => l.subjectId)
  const summaries =
    allSubjectIds.length > 0
      ? await Effect.runPromise(subjectRepo.findSummariesByIds(allSubjectIds))
      : []

  const summaryMap = new Map(summaries.map((s) => [s.id, s]))

  const sections: ThemeSection[] = themes
    .map((theme) => {
      const subjectIds = subjectIdsByTheme.get(theme.id) ?? []
      const themeSubjects = subjectIds
        .map((id) => summaryMap.get(id))
        .filter((s): s is SubjectActivitySummary => s !== undefined)
        .sort((a, b) => b.statementsCount - a.statementsCount)

      return {
        themeId: theme.id,
        themeName: theme.name,
        themeSlug: theme.slug,
        subjects: themeSubjects.slice(0, SUBJECTS_PER_THEME),
        totalCount: themeSubjects.length,
      }
    })
    .filter((s) => s.subjects.length > 0)
    .sort((a, b) => b.totalCount - a.totalCount)

  return (
    <ContentWithSidebar>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Sujets</h1>
        {canAddSubject && (
          <Button href="/s/ajouter" size="small">
            Ajouter un sujet
          </Button>
        )}
      </div>

      <SubjectSearch />

      {sections.length === 0 ? (
        <p className={styles.empty}>Aucun sujet classé pour le moment.</p>
      ) : (
        sections.map((section) => (
          <section key={section.themeId} className={styles.themeSection}>
            <div className={styles.themeSectionHeader}>
              <h2 className={styles.themeSectionTitle}>{section.themeName}</h2>
              {section.totalCount > SUBJECTS_PER_THEME && (
                <Link href={`/themes/${section.themeSlug}`} className={styles.themeSectionSeeAll}>
                  Voir les {section.totalCount} sujets →
                </Link>
              )}
            </div>

            <div className={styles.subjectList}>
              {section.subjects.map((subject) => (
                <Link key={subject.id} href={`/s/${subject.slug}`} className={styles.subjectCard}>
                  <h3 className={styles.subjectCardTitle}>{subject.title}</h3>
                  <p className={styles.subjectCardPresentation}>{subject.presentation}</p>
                  <span className={styles.subjectCardStats}>
                    {subject.statementsCount} prise{subject.statementsCount !== 1 ? 's' : ''} de
                    position
                  </span>
                </Link>
              ))}
            </div>
          </section>
        ))
      )}
    </ContentWithSidebar>
  )
}
