import Link from 'next/link'
import { Effect } from 'effect'
import { createAdminSupabaseClient } from '../../infra/supabase/admin'
import { createSubjectRepository } from '../../infra/database/subject-repository-supabase'
import { dailyIndex } from '../../domain/services/daily-pick'
import FigureAvatarStack from '../../components/figures/FigureAvatarStack'
import { plural } from '../../lib/plural'
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
    <section className={styles.card}>
      <p className={styles.kicker}>Le sujet du jour</p>
      <h2 className={styles.title}>
        <Link href={`/s/${subject.slug}`} className={styles.titleLink}>
          {subject.title}
        </Link>
      </h2>
      <p className={styles.problem}>{subject.problem}</p>
      <div className={styles.foot}>
        <span className={styles.meta}>
          {subject.positionsCount} {plural(subject.positionsCount, 'position', 'positions')} ·{' '}
          {subject.publicFiguresCount}{' '}
          {plural(subject.publicFiguresCount, 'personnalité', 'personnalités')}
        </span>
        {subject.figures.length > 0 && (
          <FigureAvatarStack
            figures={subject.figures}
            totalCount={subject.publicFiguresCount}
            max={8}
            size={36}
            hrefSuffix={`/s/${subject.slug}`}
          />
        )}
      </div>
      <Link href={`/s/${subject.slug}`} className={styles.more}>
        Découvrir les positions
      </Link>
    </section>
  )
}
