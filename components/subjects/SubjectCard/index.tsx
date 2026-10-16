import Link from 'next/link'
import AuthorAvatarStack from '../../statements/AuthorAvatarStack'
import { publicFigureRef } from '../../../domain/read-models/statement-author'
import { subjectCountsLabel } from '../../../lib/subject-counts'
import styles from './SubjectCard.module.css'

interface SubjectCardProps {
  subject: {
    title: string
    slug: string
    presentation: string
    statementsCount: number
    publicFiguresCount: number
    figures?: Array<{ id: string; name: string; slug: string }>
  }
  /** Titre plus grand, pour une carte mise en avant */
  featured?: boolean
}

/** Carte d'un sujet dans une liste : titre, présentation, compteurs, personnalités. */
export default function SubjectCard({ subject, featured }: SubjectCardProps) {
  const figures = subject.figures ?? []

  return (
    <Link
      href={`/s/${subject.slug}`}
      className={featured ? `${styles.card} ${styles.featured}` : styles.card}
    >
      <span className={styles.title}>{subject.title}</span>
      <span className={styles.presentation}>{subject.presentation}</span>
      <span className={styles.foot}>
        <span className={styles.meta}>{subjectCountsLabel(subject)}</span>
        {figures.length > 0 && (
          <AuthorAvatarStack
            authors={figures.map(publicFigureRef)}
            totalCount={subject.publicFiguresCount}
            max={5}
            size={28}
            linked={false}
          />
        )}
      </span>
    </Link>
  )
}
