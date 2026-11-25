import Link from 'next/link'
import ShareStrip from '../../components/charts/ShareStrip'
import { Debate, debateShares } from '../../domain/read-models/home-debates'
import { subjectHref } from '../../domain/read-models/hrefs'
import { plural } from '../../lib/plural'
import styles from './SubjectShelf.module.css'

/**
 * Un sujet dans le rayon de l'accueil : sa thématique, son titre, sa
 * problématique, et comment les voix s'y répartissent. La carte entière mène
 * au sujet.
 */
export default function SubjectShelfCard({ subject }: { subject: Debate }) {
  const shares = debateShares(subject)

  return (
    <Link href={subjectHref(subject.slug)} className={styles.card}>
      {subject.theme && <span className={styles.theme}>{subject.theme.name}</span>}
      <span className={styles.title}>{subject.title}</span>
      <span className={styles.problem}>{subject.problem}</span>
      <ShareStrip shares={shares} size="thin" />
      <span className={styles.counts}>
        {subject.voices} voix · {shares.length} {plural(shares.length, 'position', 'positions')}
      </span>
    </Link>
  )
}
