import Link from 'next/link'
import ActionLink from '../../../../components/ui/ActionLink'
import { positionHref, subjectHref } from '../../../../domain/read-models/hrefs'
import { TakenStance } from '../../../../domain/read-models/joint-declaration'
import styles from './TakenStanceCard.module.css'

interface TakenStanceCardProps {
  stance: TakenStance
}

/** Ce que le texte dit sur un sujet : la question, la position qu'il prend, et ses mots. */
export default function TakenStanceCard({ stance }: TakenStanceCardProps) {
  const { subject, position, quote } = stance

  return (
    <article className={styles.card}>
      <div className={styles.subject}>
        <h3 className={styles.subjectTitle}>
          <Link href={subjectHref(subject.slug)} className={styles.inkLink}>
            {subject.title}
          </Link>
        </h3>
        <p className={styles.problem}>{subject.problem}</p>
      </div>

      <div className={styles.position}>
        <span className={styles.label}>Position du texte</span>
        <Link href={positionHref(subject.slug, position.slug)} className={styles.positionLink}>
          {position.title}
        </Link>
        <blockquote className={styles.quote}>« {quote} »</blockquote>
      </div>

      <ActionLink href={subjectHref(subject.slug)} quiet>
        Voir tout le débat sur ce sujet
      </ActionLink>
    </article>
  )
}
