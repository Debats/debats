import CountBars from '../../ui/CountBars'
import { STATEMENT_TYPE_LABELS } from '../../../domain/entities/statement'
import { ExpressionProfile } from '../../../domain/services/author-analyses'
import styles from './AuthorAnalyses.module.css'

interface ExpressionProfileCardProps {
  profile: ExpressionProfile
  /** « cette personnalité », « cette organisation » */
  who: string
}

/** Par quel type de prise de position l'auteur s'exprime, et dans quelles sources. */
export default function ExpressionProfileCard({ profile, who }: ExpressionProfileCardProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Comment {who} s’exprime</h3>
      <p className={styles.subtitle}>
        Par quel type de prise de position, et dans quelles sources elle est le plus souvent citée.
      </p>
      <div className={styles.columns}>
        <div>
          <h4 className={styles.columnTitle}>Par type</h4>
          <CountBars
            entries={profile.byType.map((t) => ({
              key: t.type,
              label: STATEMENT_TYPE_LABELS[t.type],
              count: t.count,
            }))}
          />
        </div>
        <div>
          <h4 className={styles.columnTitle}>Sources les plus citées</h4>
          <CountBars
            entries={profile.sources.map((s) => ({ key: s.name, label: s.name, count: s.count }))}
          />
        </div>
      </div>
    </section>
  )
}
