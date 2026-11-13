import Link from 'next/link'
import FigureAvatar from '../../../components/figures/FigureAvatar'
import { FigureCard as FigureCardModel } from '../../../domain/read-models/figure-index'
import { figureHref } from '../../../domain/read-models/hrefs'
import { plural } from '../../../lib/plural'
import styles from './FigureSection.module.css'

interface FigureCardProps {
  figure: FigureCardModel
  /** Ce que la section dit d'elle sous son nom */
  role: string
  /** Il lui manque quelque chose que la section réclame : la carte est en creux */
  missing?: boolean
}

/** Une personnalité de l'index : qui elle est, et sur combien de sujets elle a pris position. */
export default function FigureCard({ figure, role, missing }: FigureCardProps) {
  return (
    <Link
      href={figureHref(figure.slug)}
      className={missing ? `${styles.card} ${styles.missing}` : styles.card}
    >
      <span className={styles.avatar}>
        <FigureAvatar slug={figure.slug} name={figure.name} size={56} />
      </span>
      <span className={styles.identity}>
        <span className={styles.name}>{figure.name}</span>
        {role && <span className={styles.role}>{role}</span>}
      </span>
      <span className={styles.subjects}>
        <span className={styles.count}>{figure.subjectsCount}</span>
        <span className={styles.unit}>{plural(figure.subjectsCount, 'sujet', 'sujets')}</span>
      </span>
    </Link>
  )
}
