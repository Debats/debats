import { Effect } from 'effect'
import Link from 'next/link'
import { createSSRSupabaseClient } from '../../infra/supabase/ssr'
import { createStatementRepository } from '../../infra/database/statement-repository-supabase'
import FigureAvatar from '../figures/FigureAvatar'
import styles from './last-statements.module.css'

export default async function LastStatements() {
  const supabase = await createSSRSupabaseClient()
  const statementRepo = createStatementRepository(supabase)
  const statements = await Effect.runPromise(statementRepo.findLatest(5))

  if (statements.length === 0) return null

  return (
    <div className={styles.lastStatements}>
      <h2 className={styles.title}>LES DERNIÈRES PRISES DE POSITION</h2>
      <ul className={styles.statementsList}>
        {statements.map((statement) => (
          <li key={statement.statementId} className={styles.statementItem}>
            <FigureAvatar
              slug={statement.publicFigureSlug}
              name={statement.publicFigureName}
              size={50}
            />
            <div className={styles.statementContent}>
              <div className={styles.publicFigureText}>
                <Link href={`/p/${statement.publicFigureSlug}`}>
                  <strong>{statement.publicFigureName}</strong>
                </Link>{' '}
                s&apos;est déclaré(e) pour <strong>{statement.positionTitle}</strong> dans le débat{' '}
                <Link href={`/s/${statement.subjectSlug}`}>
                  <strong>{statement.subjectTitle}</strong>
                </Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
