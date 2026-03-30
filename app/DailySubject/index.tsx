import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { dailyIndex } from '../../domain/services/daily-pick'
import ActionLink from '../../components/ui/ActionLink'
import SectionTitle from '../../components/ui/SectionTitle'
import FigureAvatarRow from '../../components/figures/FigureAvatarRow'
import SubjectCounters from '../../components/subjects/SubjectCounters'
import SubjectTitle from '../../components/subjects/SubjectTitle'
import styles from './DailySubject.module.css'

export default async function DailySubject() {
  const supabase = createAdminSupabaseClient()
  const subjectRepo = createSubjectRepository(supabase)

  const subjectIds = await Effect.runPromise(subjectRepo.findAllIds())
  if (subjectIds.length === 0) return null

  const dailyId = subjectIds[dailyIndex(subjectIds.length)]
  const subject = await Effect.runPromise(subjectRepo.findSummaryById(dailyId))
  if (!subject) return null

  return (
    <section className={styles.section}>
      <SectionTitle>Le sujet du jour</SectionTitle>
      <div className={styles.card}>
        <div className={styles.header}>
          <SubjectTitle slug={subject.slug} title={subject.title} as="h3" />
          <SubjectCounters positionsCount={subject.positionsCount} />
        </div>
        <p className={styles.presentation}>{subject.presentation}</p>
        {subject.figures.length > 0 && (
          <FigureAvatarRow
            figures={subject.figures}
            totalCount={subject.publicFiguresCount}
            size={44}
            maxLines={2}
            hrefSuffix={`/s/${subject.slug}`}
          />
        )}
        <ActionLink href={`/s/${subject.slug}`}>Découvrir les positions</ActionLink>
      </div>
    </section>
  )
}
