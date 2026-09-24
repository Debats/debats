import Link from 'next/link'
import FigureAvatarStack from '../../figures/FigureAvatarStack'
import { plural } from '../../../lib/plural'
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
        <span className={styles.meta}>
          {subject.statementsCount}{' '}
          {plural(subject.statementsCount, 'prise de position', 'prises de position')} ·{' '}
          {subject.publicFiguresCount}{' '}
          {plural(subject.publicFiguresCount, 'personnalité', 'personnalités')}
        </span>
        {figures.length > 0 && (
          <FigureAvatarStack
            figures={figures}
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
