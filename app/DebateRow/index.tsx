import Link from 'next/link'
import ShareStrip from '../../components/charts/ShareStrip'
import { Debate, debateShares } from '../../domain/read-models/home-debates'
import { subjectHref } from '../../domain/read-models/hrefs'
import styles from './DebateRow.module.css'

interface DebateRowProps {
  debate: Debate
  /** Ce que la barre veut dire, quand le bloc qui montre la ligne a quelque chose à en dire */
  note?: string
}

/**
 * Un sujet sur une ligne, dans une liste de l'accueil : son titre, ses voix,
 * la barre de ses positions. La ligne entière mène au sujet.
 */
export default function DebateRow({ debate, note }: DebateRowProps) {
  return (
    <li>
      <Link href={subjectHref(debate.slug)} className={styles.row}>
        <span className={styles.head}>
          <span className={styles.title}>{debate.title}</span>
          <span className={styles.voices}>{debate.voices} voix</span>
        </span>
        <ShareStrip shares={debateShares(debate)} size="thin" />
        {note && <span className={styles.note}>{note}</span>}
      </Link>
    </li>
  )
}
