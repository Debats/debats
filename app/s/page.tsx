import { Metadata } from 'next'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { getAuthenticatedContributor } from '../actions/get-authenticated-contributor'
import { canPerform } from '../../domain/reputation/permissions'
import {
  groupSubjectsByTheme,
  subjectIndexTotals,
  subjectsToDocument,
} from '../../domain/read-models/subject-index'
import { dailyIndex } from '../../domain/services/daily-pick'
import Button from '../../components/ui/Button'
import ContentWithSidebar from '../../components/layout/ContentWithSidebar'
import PageHero from '../../components/layout/PageHero'
import SubjectSearch from '../../components/subjects/SubjectSearch'
import IndexStats from './IndexStats'
import ThemeBar from './ThemeBar'
import ThemeSection from './ThemeSection'
import ProposeSubject from './ProposeSubject'
import RandomSubject from './RandomSubject'
import SubjectsToDocument from './SubjectsToDocument'
import { themeSectionAnchor } from './theme-section-anchor'
import styles from './subjects.module.css'

export const metadata: Metadata = {
  title: 'Sujets',
  description:
    'Tous les sujets de débat référencés sur Débats.co, thématique par thématique, avec les positions et personnalités associées.',
}

export default async function SubjectsPage() {
  const supabase = createAdminSupabaseClient()

  const [entries, contributor] = await Promise.all([
    Effect.runPromise(createSubjectRepository(supabase).findIndexEntries()),
    getAuthenticatedContributor(),
  ])
  const canAddSubject = !!contributor && canPerform(contributor.reputation, 'add_subject')
  const sections = groupSubjectsByTheme(entries)
  const candidates = entries.map(
    ({ id, title, slug, problem, statementsCount, publicFiguresCount }) => ({
      id,
      title,
      slug,
      problem,
      statementsCount,
      publicFiguresCount,
    }),
  )

  return (
    <>
      <PageHero
        kicker="Explorer"
        title="Les sujets"
        intro="Chaque sujet pose une question qui divise, et rassemble les positions qu'on y trouve, avec les personnalités et les organisations qui les défendent."
        aside={<IndexStats totals={subjectIndexTotals(entries)} />}
        actions={canAddSubject && <Button href="/s/ajouter">Ajouter un sujet</Button>}
      >
        <SubjectSearch />
      </PageHero>

      {sections.length > 0 && <ThemeBar sections={sections} />}

      <ContentWithSidebar
        topMargin
        hideLatestStatements
        aside={
          <>
            <RandomSubject candidates={candidates} initialIndex={dailyIndex(candidates.length)} />
            <SubjectsToDocument subjects={subjectsToDocument(entries)} />
            <ProposeSubject canAddSubject={canAddSubject} />
          </>
        }
      >
        {sections.length === 0 ? (
          <p className={styles.empty}>Aucun sujet pour le moment.</p>
        ) : (
          <div className={styles.sections}>
            {sections.map((section) => (
              <ThemeSection key={themeSectionAnchor(section)} section={section} />
            ))}
          </div>
        )}
      </ContentWithSidebar>
    </>
  )
}
