import Link from 'next/link'
import {
  BoardEntry,
  compatibleCountLabel,
} from '../../../../../domain/read-models/position-judgements'
import styles from './PositionsNav.module.css'

interface PositionsNavProps {
  positions: BoardEntry[]
}

/** The positions of the subject, each leading to its own face-to-face with the others */
export default function PositionsNav({ positions }: PositionsNavProps) {
  return (
    <nav className={styles.nav} aria-label="Positions du sujet">
      {positions.map(({ position, compatible, href, selected }) => (
        <Link
          key={position.id}
          href={href}
          scroll={false}
          className={selected ? `${styles.entry} ${styles.entryOn}` : styles.entry}
          aria-current={selected ? 'true' : undefined}
        >
          <span className={styles.title}>{position.title}</span>
          <span className={styles.count}>{compatibleCountLabel(compatible)}</span>
        </Link>
      ))}
    </nav>
  )
}
