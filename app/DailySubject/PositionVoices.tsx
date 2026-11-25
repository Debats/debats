import Link from 'next/link'
import { shadeOf } from '../../components/charts/shades'
import { DebateShare } from '../../domain/read-models/home-debates'
import { positionHref } from '../../domain/read-models/hrefs'
import styles from './DailySubject.module.css'

interface PositionVoicesProps {
  /** Le rang de la position dans la barre : il donne sa nuance */
  rank: number
  share: DebateShare
  subjectSlug: string
}

/** Une position du sujet du jour : sa nuance dans la barre, son nom, ses voix. */
export default function PositionVoices({ rank, share, subjectSlug }: PositionVoicesProps) {
  return (
    <li className={styles.position}>
      <span aria-hidden="true" className={`${styles.swatch} ${shadeOf(rank)}`} />
      <Link href={positionHref(subjectSlug, share.slug)} className={styles.positionTitle}>
        {share.label}
      </Link>
      <span className={styles.voices}>{share.count} voix</span>
    </li>
  )
}
