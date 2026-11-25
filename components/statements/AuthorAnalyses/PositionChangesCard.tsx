import Link from 'next/link'
import {
  authorOnSubjectHref,
  StatementAuthorRef,
} from '../../../domain/read-models/statement-author'
import { PositionChange } from '../../../domain/services/author-analyses'
import PositionTrailSteps from './PositionTrailSteps'
import styles from './AuthorAnalyses.module.css'

interface PositionChangesCardProps {
  changes: PositionChange[]
  /** The author the analysis is about: her subject pages are linked */
  author: StatementAuthorRef
  /** « cette personnalité », « cette organisation » */
  who: string
}

/** Les sujets où l'auteur est passé d'une position à une autre, dans l'ordre. */
export default function PositionChangesCard({ changes, author, who }: PositionChangesCardProps) {
  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Changements de position</h3>
      <p className={styles.subtitle}>
        Les sujets où {who} a pris plusieurs positions au fil du temps, dans l’ordre où elles ont
        été exprimées.
      </p>
      {changes.length === 0 ? (
        <p className={styles.empty}>Aucun changement de position recensé.</p>
      ) : (
        <ul className={styles.rows}>
          {changes.map((change) => (
            <li key={change.subject.id} className={styles.changeRow}>
              <Link
                href={authorOnSubjectHref(author, change.subject.slug)}
                className={styles.subject}
              >
                {change.subject.title}
              </Link>
              {change.trails.map((trail, index) => (
                <PositionTrailSteps key={index} trail={trail} />
              ))}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
