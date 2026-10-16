import Link from 'next/link'
import AuthorAvatarStack from '../../../components/statements/AuthorAvatarStack'
import { publicFigureRef } from '../../../domain/read-models/statement-author'
import { SubjectIndexEntry } from '../../../domain/read-models/subject-index'
import { subjectCountsLabel } from '../../../lib/subject-counts'
import styles from './FeaturedSubjectCard.module.css'

interface FeaturedSubjectCardProps {
  subject: SubjectIndexEntry
  /** Petit libellé au-dessus du titre, absent quand le sujet est seul dans sa section */
  kicker?: string
}

/** Le sujet mis en avant d'une thématique : son titre, sa problématique, qui en parle. */
export default function FeaturedSubjectCard({ subject, kicker }: FeaturedSubjectCardProps) {
  return (
    <Link href={`/s/${subject.slug}`} className={styles.card}>
      <span className={styles.main}>
        {kicker && <span className={styles.kicker}>{kicker}</span>}
        <span className={styles.title}>{subject.title}</span>
        <span className={styles.problem}>{subject.problem}</span>
      </span>
      <span className={styles.aside}>
        <AuthorAvatarStack
          authors={subject.figures.map(publicFigureRef)}
          totalCount={subject.publicFiguresCount}
          max={5}
          size={32}
          linked={false}
        />
        <span className={styles.meta}>{subjectCountsLabel(subject)}</span>
      </span>
    </Link>
  )
}
