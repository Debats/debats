import Link from 'next/link'
import { shadeOf } from '../../components/charts/shades'
import AuthorAvatarStack from '../../components/statements/AuthorAvatarStack'
import { DebateShare } from '../../domain/read-models/home-debates'
import { DAILY_FACES } from '../../domain/read-models/home-page'
import { positionHref, subjectHref } from '../../domain/read-models/hrefs'
import { StatementAuthorRef } from '../../domain/read-models/statement-author'
import styles from './DailySubject.module.css'

interface PositionVoicesProps {
  /** Le rang de la position dans la barre : il donne sa nuance */
  rank: number
  share: DebateShare
  subjectSlug: string
  /** Les premiers visages de la position */
  authors: StatementAuthorRef[]
}

/** Une position du sujet du jour : sa nuance dans la barre, son nom, ses visages, ses voix. */
export default function PositionVoices({ rank, share, subjectSlug, authors }: PositionVoicesProps) {
  return (
    <li className={styles.position}>
      <span aria-hidden="true" className={`${styles.swatch} ${shadeOf(rank)}`} />
      <Link href={positionHref(subjectSlug, share.slug)} className={styles.positionTitle}>
        {share.label}
      </Link>
      <AuthorAvatarStack
        authors={authors}
        totalCount={share.count}
        max={DAILY_FACES}
        size={28}
        subjectSlug={subjectSlug}
        moreHref={subjectHref(subjectSlug)}
      />
      <span className={styles.voices}>{share.count} voix</span>
    </li>
  )
}
