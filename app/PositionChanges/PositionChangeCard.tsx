import Link from 'next/link'
import AuthorAvatar from '../../components/statements/AuthorAvatar'
import { figureOnSubjectHref } from '../../domain/read-models/hrefs'
import { PositionChange } from '../../domain/read-models/position-changes'
import { publicFigureRef } from '../../domain/read-models/statement-author'
import ChangeSideLabel from './ChangeSideLabel'
import styles from './PositionChanges.module.css'

/**
 * Un changement de position : qui, sur quel sujet, la position quittée et la
 * position prise. La carte entière mène à la page de la personnalité sur ce
 * sujet, où les deux prises de position se lisent avec leurs sources.
 */
export default function PositionChangeCard({ change }: { change: PositionChange }) {
  const { figure, subject, from, to } = change

  return (
    <li>
      <Link href={figureOnSubjectHref(figure.slug, subject.slug)} className={styles.card}>
        <span className={styles.who}>
          <AuthorAvatar author={publicFigureRef(figure)} size={56} />
          <span className={styles.line}>
            <strong className={styles.name}>{figure.name}</strong>
            <span className={styles.subject}>sur {subject.title}</span>
          </span>
        </span>
        <span className={styles.move}>
          <ChangeSideLabel side={from} />
          <svg
            className={styles.arrow}
            width="32"
            height="16"
            viewBox="0 0 32 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="puis"
          >
            <path d="M1 8h29M24 2l6 6-6 6" />
          </svg>
          <ChangeSideLabel side={to} />
        </span>
      </Link>
    </li>
  )
}
