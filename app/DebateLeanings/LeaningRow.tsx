import Link from 'next/link'
import ShareStrip from '../../components/charts/ShareStrip'
import { Debate, debateShares, leadOf } from '../../domain/read-models/home-debates'
import { subjectHref } from '../../domain/read-models/hrefs'
import { leaningNote } from './leaning-note'
import styles from './DebateLeanings.module.css'

/** Un sujet dans une colonne de la comparaison : son titre, ses voix, sa barre, ce qu'elle dit. */
export default function LeaningRow({ debate }: { debate: Debate }) {
  const lead = leadOf(debate)

  return (
    <li>
      <Link href={subjectHref(debate.slug)} className={styles.row}>
        <span className={styles.rowHead}>
          <span className={styles.rowTitle}>{debate.title}</span>
          <span className={styles.rowVoices}>{debate.voices} voix</span>
        </span>
        <ShareStrip shares={debateShares(debate)} size="thin" />
        {lead && <span className={styles.rowNote}>{leaningNote(lead, debate.voices)}</span>}
      </Link>
    </li>
  )
}
