import { StatementContent, voteSense } from '../../../domain/entities/statement'
import styles from './StatementBody.module.css'

/**
 * Ce que porte la prise de position, rendu selon sa nature. Seules des paroles
 * s'affichent comme une citation : un vote et un acte s'énoncent comme les
 * faits qu'ils sont, pour que le site ne mette jamais dans la bouche de
 * quelqu'un ce qu'il a seulement voté ou fait.
 */
export default function StatementBody({ content }: { content: StatementContent }) {
  switch (content.kind) {
    case 'declaration':
      return <blockquote className={styles.quote}>{content.quote}</blockquote>

    case 'program':
      return (
        <>
          <blockquote className={styles.quote}>{content.quote}</blockquote>
          <p className={styles.fact}>
            <span className={styles.label}>Programme</span>
            {content.document}
          </p>
        </>
      )

    case 'vote':
      return (
        <p className={styles.fact}>
          <span className={styles.label}>{voteSense(content.choice)}</span>
          {content.votedText}
        </p>
      )

    case 'act':
      return <p className={styles.fact}>{content.deed}</p>
  }
}
